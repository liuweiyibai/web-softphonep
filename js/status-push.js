var CalleeCode = {
    FREE_CALL: 0,   //空闲中
    RING_CALL: 5,   //被叫振铃
    ANSWER_CALL: 6, //被叫应答
    OVER_CALL: 4    //被叫接听超时
};

var WebSocketStatus = {
    CONNECT_SUCCESS: 1, // websocket连接成功
    CONNECT_CLOSE:   2, // websocket连接关闭
    CONNECT_FAILED:  3  // websocket连接失败
};

// 状态推送监控
if (!window.WebSocket) {
    window.WebSocket = window.MozWebSocket;
}
var status_push;
var websocket_connect_count = 0;
var websocket_timer = null;
var StatusPush = {
    init: function (config) {
        websocket_connect_count = 4;
        StatusPush.connection(config);
    },
    connection: function(config){
        if (!window.WebSocket){
            console.log("--------抱歉，您的浏览器不支持WebSocket--------");
            return false;
        }

        if (config["status_push_url"] === '' || config["status_push_url"] == undefined){
            console.log("--------状态监控连接地址未填写,websocket状态推送监控初始化失败--------");
            config.websocket_event(WebSocketStatus.CONNECT_CLOSE, "状态推送监控地址未填写,websocket状态推送监控初始化失败")
            return false;
        }

        if (config["client_number"] === '' || config["client_number"] == undefined){
            console.log("--------SIP账号未填写,websocket状态推送监控初始化失败--------");
            config.websocket_event(WebSocketStatus.CONNECT_CLOSE, "SIP账号未填写,websocket状态推送监控初始化失败")
            return false;
        }

        //检测浏览器是否支持状态推送监控WebSocket
        if (window.WebSocket)
        {
            let url = config["status_push_url"]+"/websocket?clientNumber="+config["client_number"];
            status_push = new WebSocket( url );
            status_push.onmessage = function(event) {
                if (event.data == 'Echo: "1"'){
                    return true;
                }
                let data = JSON.parse(event.data);//json字符转json对象
                if (data.code == undefined){
                    // 空闲中
                    console.log(data)
                    config.callee_event(CalleeCode.FREE_CALL, data)
                }
                switch (data.code) {
                    case 101:
                        if (data.info.status == CalleeCode.RING_CALL){
                            // 被叫振铃事件
                            config.callee_event(CalleeCode.RING_CALL, data)
                        }else if (data.info.status == CalleeCode.ANSWER_CALL){
                            // 被叫接听事件
                            config.callee_event(CalleeCode.ANSWER_CALL, data)
                        }else if (data.info.status == CalleeCode.OVER_CALL){
                            config.callee_event(CalleeCode.OVER_CALL, data)
                        }
                        break;
                    default:
                        break;
                }
            };
            status_push.onopen = function(event) {
                websocket_connect_count = 0;
                config.websocket_event(WebSocketStatus.CONNECT_SUCCESS, "websocket连接成功")
                StatusPush.check_connection();
            };
            status_push.onclose = function(event) {
                console.log(event)
                console.log("websocket连接关闭onclose")
                if (websocket_timer) {
                    window.clearInterval(websocket_timer);
                    websocket_timer = null;
                }
                // 网络断开之后重连5次，若是失败则抛出连接关闭事件
                websocket_connect_count +=1;
                if (websocket_connect_count > 4){
                    console.log("websocket重连5次后，若是失败则抛出连接关闭事件==>"+websocket_connect_count);
                    websocket_connect_count = 0;
                    config.websocket_event(WebSocketStatus.CONNECT_CLOSE, "websocket连接关闭onclose")
                    return false
                }else{
                    if (websocket_connect_count == 1){
                        console.log("websocket重连5次后，若是失败则抛出连接关闭事件==>"+websocket_connect_count);
                        StatusPush.connection(config);
                    }else{
                        setTimeout(function () {
                            let myDate = new Date();
                            console.log(myDate.toLocaleString()+"++++每30秒检查websocket连接++++")
                            console.log("websocket重连5次后，若是失败则抛出连接关闭事件==>"+websocket_connect_count);
                            StatusPush.connection(config);
                        }, 30000);
                    }
                }
            };
            status_push.onerror = function(event) {
                console.log(event)
                console.log("websocket连接关闭onerror")
                if (websocket_connect_count > 4){
                    config.websocket_event(WebSocketStatus.CONNECT_CLOSE, "websocket连接关闭onerror")
                }
            };
        }
    },
    check_connection: function(){
        if (websocket_timer) {
            window.clearInterval(websocket_timer);
            websocket_timer = null;
        }

        websocket_timer = setInterval(function () {
            let myDate = new Date();
            console.log(myDate.toLocaleString()+"++++每30秒检查websocket连接++++")
            status_push.send(JSON.stringify(1));
        },30000)
    },
    close: function () {
        if (status_push == undefined){
            return false;
        }

        if (websocket_timer) {
            window.clearInterval(websocket_timer);
            websocket_timer = null;
        }

        status_push.close()
        connect_colse_count = 4;
    }
}
