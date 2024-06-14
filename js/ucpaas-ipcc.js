
var LoginStatus = {
    REGISTER_SUCCESS: 0,
    CONNECT_SUCCESS: 1,
    CONNECT_FAILED: 2,
    REGISTER_FAILED: 3,
    REGISTER_AUTH_FAILED: 4,
    CALLIN: 5,
    OTHER: 99
};
var CallStatus = {
    CALL_ENDED: 0,
    PROGRESS_CALL: 1,
    ANSWER_CALL: 2,
    REJECT_CALL: 3,
    HANG_UP_CALL: 4,
    CANCEL_CALL: 5,
    BYE_CALL: 6,
    CALL_FAILED: 7,
    OTHER: 99
};

var UCConfig = {
    userAgentString: 'Ucpaas Web UA',
    traceSip: true,
    register: true,
    keepAliveInterval: 60, // 保活机制，每隔多长时间（ms）send一个心跳包，发5次（系统值）
    autostart: true,
    autostop: false
};

var UCUA = {
    ua:null,
    out_session: null,
    in_sessions:{},
    domain:null,
    CallStatus:0
};

// 连接关闭次数达到5次的时候告诉回调事件
var connect_colse_count = 0;

var UCSIPCC = {
    init: function(config){
        UCUA.ua.contact.uri.user = config["authorizationUser"];
        UCUA.ua.transportConnectingTimer =
        UCUA.ua.on('connected', function (){
            console.log("--------\n连接成功 %d：%s\n", LoginStatus.CONNECT_SUCCESS, UCConfig["wsServers"]);
            config.on_event(LoginStatus.CONNECT_SUCCESS, "连接成功");
        });
        UCUA.ua.on('disconnected', function (){
            console.log("--------\n连接关闭：%s\n",UCConfig["wsServers"]);
            if (UCUA.ua != undefined){
                UCUA.ua.stop();
                delete UCUA.ua;
            }
            connect_colse_count = connect_colse_count + 1;
            console.log("连接失败次数===>"+connect_colse_count)
            if (connect_colse_count > 4){
                console.log("--------\n连接关闭：%s\n","连接失败次数达到5次时, 触发连接关闭回调通知");
                config.on_event(LoginStatus.CONNECT_FAILED, "连接关闭");
            }else{
                console.log("--------\n连接关闭：%s\n","延时1秒触发重新注册");
                setTimeout(function () {
                    console.log("--------执行了重新注册--------");
                    UCUA.ua = new SIP.UA(UCConfig);
                    UCSIPCC.init(config);
                }, 1000);
            }
        });
        UCUA.ua.on('unregistered', function (response, cause) {
            console.log("--------\n未注册:%s\n", cause);
        });
        UCUA.ua.on('registered', function (){
            connect_colse_count = 0;
            console.log("--------\n注册成功：%s\n",UCConfig["displayName"]);
            config.on_event(LoginStatus.REGISTER_SUCCESS, "注册成功");
        });
        UCUA.ua.on('registrationFailed', function (response, cause) {
            if (cause === SIP.C.causes.AUTHENTICATION_ERROR){
                connect_colse_count = 4;
                console.log("--------\n注册鉴权失败：%s\n",UCConfig["wsServers"]);
                config.on_event(LoginStatus.REGISTER_AUTH_FAILED, "注册鉴权失败");
            }else{
                console.log("--------\n注册失败：%s\n",UCConfig["wsServers"]);
                config.on_event(LoginStatus.REGISTER_FAILED, "注册失败");
            }
            UCUA.ua.stop();
            delete UCUA.ua;
        });
        UCUA.ua.on('invite', function (session) {
            var incall = {};
            var uri = session ? session.remoteIdentity.uri :
                SIP.Utils.normalizeTarget(uri, UCUA.ua.configuration.hostport_params);
            if (!uri) { return; }
            UCUA.in_sessions[uri] = session;
            UCUA.in_sessions[uri].on('bye', function (response) {
                delete UCUA.in_sessions[uri];
            });
            var displayName = (session && session.remoteIdentity.displayName) || uri.user;
            console.log("--------\n%s正在呼入\n", displayName);
            incall.uri = uri;
            incall.displayName = displayName;
            config.on_inbound(incall);
        });
    },
    login: function(config){

        var idx = config["wsServers"].lastIndexOf("//");
        UCUA.domain = config["wsServers"].substr(idx + 2);
        UCConfig["wsServers"] = config["wsServers"];
        UCConfig["uri"] = config["authorizationUser"] + "@" + UCUA.domain;
        UCConfig["displayName"] = config["authorizationUser"];
        UCConfig["password"] = config["password"];
        UCConfig["registerExpires"] = 120; // 默认120秒过期后自动注册
        connect_colse_count = 4;
        UCUA.ua = new SIP.UA(UCConfig);
        // 初始化回调事件
        UCSIPCC.init(config);
    },
    logout: function(){
        if (!UCUA.ua) return;

        if (UCUA.ua.isRegistered()) {
            console.log('===================关闭'+(120000/1000)+'秒自动注册==================');
            // UCUA.ua.unregister();
            UCUA.ua.stop();
            connect_colse_count = 4;
        }
    },
    createNewCall: function(callee, option){
        if (option == "" || option == undefined || option == null) {
            console.log("--------\n createNewCall option 参数未定义\n");
            return;
        }
        var reg = /^\d{0,16}$/;
        if(!reg.test(callee)){
            console.log("--------\n createNewCall 参数错误：请填写不多于16位整数的被叫号码\n");
            return;
        }

        var uri = callee + "@" + UCUA.domain;
        var options = {
            media: {
                constraints: {
                    audio: true,
                    video: false
                }
            }
        };

        options.extraHeaders = []

        //设置display
        if (option.display) {
            options.extraHeaders.push("X-Display: " + option.display)
        }

        //设置data
        if (option.data) {
            options.extraHeaders.push("X-Data: " + option.data)
        }

        // Send invite
        UCUA.out_session = UCUA.ua.invite(uri, options);
        UCUA.out_session.mediaHandler.on('getDescription', function (sdpWrapper) {
            sdpWrapper.sdp = sdpWrapper.sdp.replace(/[\w-]*\.local/g, '127.0.0.1');
        });

        console.log("caller:%s, uri:%s, display:%s, data:%s", callee, uri, option.display, option.data);
        if (!UCUA.out_session)
            return;
        UCUA.out_session.on('progress', function (response) {
            console.log("--------\n呼叫中...\n");
            option.session_event(CallStatus.PROGRESS_CALL, response.call_id);
        });
        UCUA.out_session.on('rejected', function (response, cause) {
            console.log("--------\n rejected:%s\n", cause);
            //option.session_event(CallStatus.PROCESS_CALL, response.call_id);
        });
        UCUA.out_session.on('failed', function (response, cause) {
            console.log("--------\n呼叫失败:%s\n", cause);
            option.session_event(CallStatus.CALL_FAILED, cause);
        });
        UCUA.out_session.on('terminated', function (message, cause) {
            console.log("--------\n呼叫结束\n");
            option.session_event(CallStatus.CALL_ENDED, "");
            delete UCUA.out_session;
        });
        UCUA.out_session.on('cancel', function () {
            console.log("--------\n取消呼叫...\n");
            option.session_event(CallStatus.CANCEL_CALL, "");
        });
        UCUA.out_session.on('bye', function (response) {
            console.log("--------\n挂机...\n");
            option.session_event(CallStatus.BYE_CALL, response.call_id);
        });
        UCUA.out_session.on('accepted', function (data) {
            UCUA.out_session.mediaHandler.render(option.renderHint);
            option.session_event(CallStatus.ANSWER_CALL, "");
        });
        UCUA.out_session.mediaHandler.on('addStream', function () {
            UCUA.out_session.mediaHandler.render(option.enderHint);
        });
    },
    configInbound: function(incall, option){
        if (option == "" || option == undefined || option == null) {
            console.log("--------\n configInbound option 参数未定义\n");
            return;
        }
        if (!UCUA.in_sessions[incall.uri])
            return;

        UCUA.in_sessions[incall.uri].mediaHandler.on('getDescription', function (sdpWrapper) {
            sdpWrapper.sdp = sdpWrapper.sdp.replace(/[\w-]*\.local/g, '127.0.0.1');
        });

        UCUA.in_sessions[incall.uri].on('failed', function (response, cause) {
            console.log("--------\n呼入失败:%s\n", cause);
            option.session_event(CallStatus.CALL_FAILED, incall);
        });
        UCUA.in_sessions[incall.uri].on('terminated', function (message, cause) {
            console.log("--------\n呼入结束:%s\n", cause);
            option.session_event(CallStatus.CALL_ENDED, incall);
            delete UCUA.in_sessions[incall.uri];
        });
        UCUA.in_sessions[incall.uri].on('cancel', function () {
            console.log("--------\n呼入已取消...\n");
            option.session_event(CallStatus.CANCEL_CALL, incall);
        });
        UCUA.in_sessions[incall.uri].on('bye', function (response) {
            console.log("--------\n挂机...\n");
            option.session_event(CallStatus.BYE_CALL, incall);
        });
        UCUA.in_sessions[incall.uri].on('accepted', function (data) {
            console.log("--------\n接机...\n");
            UCUA.in_sessions[incall.uri].mediaHandler.render(option.renderHint);
            option.session_event(CallStatus.ANSWER_CALL, incall);
        });
        UCUA.in_sessions[incall.uri].mediaHandler.on('addStream', function () {
            console.log("--------\naddStream...\n");
            UCUA.in_sessions[incall.uri].mediaHandler.render(option.enderHint);
        });
    },
    acceptCall: function(incall){
        if (!UCUA.in_sessions[incall.uri])
            return;

        var options = {
            media: {
                constraints: {
                    audio: true,
                    video: false
                }
            }
        };

        if (UCUA.in_sessions[incall.uri].accept && !UCUA.in_sessions[incall.uri].startTime) { // Incoming, not connected
            UCUA.in_sessions[incall.uri].accept(options);
        }
    },
    hangupOutCall: function(){
        if (!UCUA.out_session) {
            return;
        } else if (UCUA.out_session.startTime) { // Connected
            UCUA.out_session.bye();
        } else if (UCUA.out_session.cancel) { // Outbound
            UCUA.out_session.cancel();
        }
        console.log("--------\n主叫挂机...\n");
    },
    hangupInCall: function(incall){
        if (!UCUA.in_sessions[incall.uri]) {
            return;
        } else if (UCUA.in_sessions[incall.uri].startTime) { // Connected
            console.log("--------\n挂机...\n");
            UCUA.in_sessions[incall.uri].bye();
        } else if (UCUA.in_sessions[incall.uri].reject) { // Incoming
            console.log("--------\n拒接...\n");
            UCUA.in_sessions[incall.uri].reject();
        }
    }
};

