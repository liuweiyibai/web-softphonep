//获取参数
function GetQueryString(name) {
  var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
  var r = window.location.search.substr(1).match(reg);
  if (r != null) return decodeURI(r[2]);
  return null;
}

var exten = GetQueryString("exten"); // = 2000;     //分机号
var company = GetQueryString("company"); // = 10;       //公司id
var clientNumber = GetQueryString("clientNumber"); // = 60000000000004; //SIP账号
var callPopUrl = GetQueryString("callPopUrl"); // = "wss://rtctest.ipcc.caih.com:15689";  //通话弹屏监控脚本地址
var callStateUrl = GetQueryString("callStateUrl"); // = "wss://rtctest.ipcc.caih.com:15687";  //通话时长监控脚本地址

var extenstr = ""; // 当前分机状态数据
var timestamp = new Date().getTime();
var socket; // 通话弹屏监控socket
var iscall = 0; // 是否通话中0:否, 1是
var callId = ""; // 话单的唯一通话标识：callId

// 接口url
var sid = GetQueryString("sid"); // = "3db43d2a056b27f88e8f9e304405fc48";
var appid = GetQueryString("appid"); // = "e5a6e83014bf4a96a009aa9c1a165adf";
var token = GetQueryString("token"); // = "df6e7185208a8f451449f9155d8cb6c2";
var setStateUrl = GetQueryString("setStateUrl"); // = "https://saastest.ipcc.caih.com/ipcc/callTool.html?f=setState";      // 示忙示闲接口
var callKeepUrl = GetQueryString("callKeepUrl"); // = "https://saastest.ipcc.caih.com/ipcc/callTool.html?f=callHold";      // 通话保持接口
var callTransferUrl = GetQueryString("callTransferUrl"); // = "https://saastest.ipcc.caih.com/ipcc/callTool.html?f=callTransfer";  // 获取用户接口
var callRegisterUrl = GetQueryString("callRegister"); // = "https://saastest.ipcc.caih.com/ipcc/callTool.html?f=callTransfer";  // 获取softphone登录地址

if (clientNumber) {
  $('input[name="authorizationUser"]').val(clientNumber);
}
if (callRegisterUrl) {
  $('input[name="wsServers"]').val(callRegisterUrl);
}

// 坐席列表数据
var htmlStr = GetQueryString("htmlStr");
$("#transferUser").html(htmlStr);

if (!window.WebSocket) {
  window.WebSocket = window.MozWebSocket;
}
//检测浏览器是否支持通话弹屏&分机状态监控WebSocket
if (window.WebSocket && exten != "" && exten != null) {
  socket = new WebSocket(
    callPopUrl +
      "/websocket?company=" +
      company +
      "&exten=" +
      exten +
      "&clientNumber=" +
      clientNumber +
      "&sessionId=" +
      company +
      exten +
      timestamp
  );
  console.log(
    "弹屏&分机状态监控url:" +
      callPopUrl +
      "/websocket?company=" +
      company +
      "&exten=" +
      exten +
      "&clientNumber=" +
      clientNumber +
      "&sessionId=" +
      company +
      exten +
      timestamp
  );
  socket.onmessage = function (event) {
    extenstr = event.data;
    var data = JSON.parse(event.data); //json字符转json对象
    // console.log(data);
    switch (data.code) {
      case 100:
        console.log("推送通话弹屏&分机状态监控脚本校验成功返回消息");
        getValue(data);
        break;
      case 101:
        // console.log("推送坐席状态消息");
        getValue(data);
        break;
      case 102:
        console.log("推送通话记录消息");
        getValue(data);
        break;
      case 103:
        console.log("推送二次登陆消息");
        getValue(data);
        break;
    }
  };
  socket.onopen = function (event) {
    console.log("打开坐席弹屏&分机状态监控服务正常，浏览器支持WebSocket!");
  };
  socket.onclose = function (event) {
    console.log("消息推送关闭，请重新登录!");
    alert("消息推送关闭，请重新登录!");
  };
  socket.onerror = function (event) {
    console.log("消息推送意外关闭，请重新登录!");
    alert("消息推送意外关闭，请重新登录!");
  };
} else if (window.WebSocket && (exten == "" || exten == null)) {
  $("#extensionStatusIcon").attr("src", "img/fenjizhuangtai2.png");
  $("#extensionStatusIcon").attr("title", "分机未登录");
} else {
  console.log("抱歉，您的浏览器不支持消息推送!");
  alert("抱歉，您的浏览器不支持消息推送!");
}

//公用函数=====================================

// 弹屏&分机状态数据解析
function getValue(str) {
  //参数(obj)
  var type = str.type;
  var info_arr = str.info;
  console.log(str);
  // if(type=="pop")
  // {   // 弹屏事件推送(softPhone不支持弹屏)
  // }

  if (type == "status") {
    // 坐席状态事件推送
    if (info_arr.status == 3) {
      // 分机未登录
      $("#extensionStatusIcon").attr("src", "img/fenjizhuangtai2.png");
      $("#extensionStatusIcon").attr("title", "分机未登录");
      $("#extensionStatus").css("color", "#bfbfbf");
      $("#extensionStatus").html("未登录");

      $("#extensionTipIcon").attr("src", "img/shixian.png");
      $("#extensionTipIcon").attr("title", "示忙");
      $("#extensionTip").css("color", "#009688");
      $("#extensionTip").html("示闲");
      iscall = 0;
    } else if (info_arr.status == 1) {
      $("#extensionTipIcon").attr("src", "img/shimang.png");
      $("#extensionTipIcon").attr("title", "示闲");
      $("#extensionTip").css("color", "#e83742");
      $("#extensionTip").html("示忙");
      // 分机已登录&示忙
      if (info_arr.ofsta == 1) {
        // 示忙中
        $("#extensionStatusIcon").attr("src", "img/fenjizhuangtai3.png");
        $("#extensionStatusIcon").attr("title", "示忙中");
        $("#extensionStatus").css("color", "#e83742");
        $("#extensionStatus").html("示忙中");
        iscall = 0;
      } else if (info_arr.ofsta == 5) {
        // 振铃中
        $("#extensionStatusIcon").attr("src", "img/fenjizhuangtai5.png");
        $("#extensionStatusIcon").attr("title", "振铃中");
        $("#extensionStatus").css("color", "#ff9900");
        $("#extensionStatus").html("振铃中");
        iscall = 0;
      } else if (info_arr.ofsta == 6) {
        // 通话中
        $("#extensionStatusIcon").attr("src", "img/fenjizhuangtai4.png");
        $("#extensionStatusIcon").attr("title", "通话中");
        $("#extensionStatus").css("color", "#81ea42");
        $("#extensionStatus").html("通话中");
        iscall = 1;
      } else {
        // 空闲中
        $("#extensionStatusIcon").attr("src", "img/fenjizhuangtai1.png");
        $("#extensionStatusIcon").attr("title", "空闲中");
        $("#extensionStatus").css("color", "#009688");
        $("#extensionStatus").html("空闲中");
        iscall = 0;
      }
    } else if (info_arr.status == 0) {
      // 分机已登录&示闲
      if (info_arr.ofsta == 5) {
        // 振铃中
        $("#extensionStatusIcon").attr("src", "img/fenjizhuangtai5.png");
        $("#extensionStatusIcon").attr("title", "振铃中");
        $("#extensionStatus").css("color", "#ff9900");
        $("#extensionStatus").html("振铃中");
        iscall = 0;
      } else if (info_arr.ofsta == 6) {
        // 通话中
        $("#extensionStatusIcon").attr("src", "img/fenjizhuangtai4.png");
        $("#extensionStatusIcon").attr("title", "通话中");
        $("#extensionStatus").css("color", "#81ea42");
        $("#extensionStatus").html("通话中");
        iscall = 1;
      } else {
        // 空闲中
        $("#extensionStatusIcon").attr("src", "img/fenjizhuangtai1.png");
        $("#extensionStatusIcon").attr("title", "空闲中");
        $("#extensionStatus").css("color", "#009688");
        $("#extensionStatus").html("空闲中");
        iscall = 0;
      }
      $("#extensionTipIcon").attr("src", "img/shixian.png");
      $("#extensionTipIcon").attr("title", "示忙");
      $("#extensionTip").css("color", "#009688");
      $("#extensionTip").html("示闲");

      $("#callKeepIcon").attr("src", "img/tonghuabaochi1.png");
      $("#callKeepIcon").attr("title", "通话保持");
      $("#callKeep").css("color", "#009688");
      $("#callKeep").html("保持");
    }
    callId = info_arr.callId;
  }
}

// 生成随机字符串
function randomString(len) {
  len = len || 16;
  var $chars = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
  var maxPos = $chars.length;
  var pwd = "";
  for (i = 0; i < len; i++) {
    pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return pwd;
}

// 通话状态时长
function secondReading(data) {
  var html = "";
  if (data.code == "101") {
    if (data.info.status == "5") {
      html += "振铃中：";
      html += formatSeconds(data.info.callTime);
    } else if (data.info.status == "6") {
      html += "通话：";
      html += formatSeconds(data.info.callTime);
    } else if (data.info.status == "4") {
      console.log("超时未接听：" + data.info.callTime);
      html = "";
    }
    $("#secondReading").html(html);
  }
}

// 时间格式化
function formatSeconds(time) {
  var hh;
  var mm;
  var ss;
  //传入的时间为空或小于0
  if (time == null || time < 0) {
    return;
  }
  //得到小时
  hh = (time / 3600) | 0;
  time = parseInt(time) - hh * 3600;
  if (parseInt(hh) < 10) {
    hh = "0" + hh;
  }
  //得到分
  mm = (time / 60) | 0;
  //得到秒
  ss = parseInt(time) - mm * 60;
  if (parseInt(mm) < 10) {
    mm = "0" + mm;
  }
  if (ss < 10) {
    ss = "0" + ss;
  }
  return hh + ":" + mm + ":" + ss;
}

//话务条事件=====================================

// 示忙示闲事件
function extensionBusyOrLeisure() {
  if (!exten) {
    parent.layer.msg("暂无分机，操作失败！", { icon: 7 });
    return false;
  }
  if (!extenstr) {
    parent.layer.msg("暂无分机状态信息，操作失败！", { icon: 7 });
    return false;
  }
  var json = JSON.parse(extenstr); // //json字符转json对象
  var type = json["type"];
  var info_arr = json["info"];
  if (type == "status") {
    if (info_arr.status == 3) {
      parent.layer.msg("分机未登录，请先登录分机！", { icon: 7 });
      return false;
    } else if (info_arr.ofsta == 1) {
      //调用示闲接口
      $.ajax({
        url: setStateUrl,
        type: "post",
        data: {
          exten: exten,
          state: 0,
          company_id: company,
          sid: sid,
          appid: appid,
          token: token,
        },
        dataType: "json",
        success: function (msg) {
          if (msg.status) {
            $("#extensionTipIcon").attr("src", "img/shixian.png");
            $("#extensionTipIcon").attr("title", "示忙");
            $("#extensionTip").css("color", "#009688");
            $("#extensionTip").html("示闲");
            parent.layer.msg(msg.info, { icon: 1 });
          } else {
            parent.layer.msg(msg.info, { icon: 2 });
          }
        },
      });
    } else if (info_arr.ofsta == 0 || info_arr.ofsta == 4) {
      // 4为超时未接听
      //调用示忙接口
      $.ajax({
        url: setStateUrl,
        type: "post",
        data: {
          exten: exten,
          state: 1,
          company_id: company,
          sid: sid,
          appid: appid,
          token: token,
        },
        dataType: "json",
        success: function (msg) {
          if (msg.status) {
            $("#extensionTipIcon").attr("src", "img/shimang.png");
            $("#extensionTipIcon").attr("title", "示闲");
            $("#extensionTip").css("color", "#e83742");
            $("#extensionTip").html("示闲");
            parent.layer.msg(msg.info, { icon: 1 });
          } else {
            parent.layer.msg(msg.info, { icon: 2 });
          }
        },
      });
    }
  } else {
    parent.layer.msg("系统正在连接中，请稍等……", { icon: 2 });
  }
}

// 通话保持(需要引入jquery.cookie.js)
function keep() {
  if (iscall == 1 && callId != "") {
    if ($.cookie("agent") == "" || $.cookie("agent") == null) {
      $.ajax({
        url: callKeepUrl,
        type: "post",
        data: {
          callId: callId,
          type: "callHold",
          extension: exten,
          company_id: company,
          sid: sid,
          appid: appid,
          token: token,
        },
        dataType: "json",
        success: function (msg) {
          if (msg.status) {
            parent.layer.msg(msg.info, { icon: 1 });
            $.cookie("agent", "1", { expires: 999 });
            $("#callKeepIcon").attr("src", "img/tonghuabaochi2.png");
            $("#callKeepIcon").attr("title", "通话恢复");
            $("#callKeep").css("color", "#e83742");
            $("#callKeep").html("取回");
          } else {
            if (msg.info == null || msg.info == "") {
              parent.layer.msg(msg.info, { icon: 7 });
            } else {
              parent.layer.msg(msg.info, { icon: 7 });
            }
          }
        },
      });
    } else {
      $.ajax({
        url: callKeepUrl,
        type: "post",
        data: {
          callId: callId,
          type: "callHoldRescue",
          extension: exten,
          company_id: company,
          sid: sid,
          appid: appid,
          token: token,
        },
        dataType: "json",
        success: function (msg) {
          if (msg.status) {
            $("#callKeepIcon").attr("src", "img/tonghuabaochi1.png");
            $("#callKeepIcon").attr("title", "通话保持");
            $("#callKeep").css("color", "#009688");
            $("#callKeep").html("保持");
            $.cookie("agent", null);
            parent.layer.msg(msg.info, { icon: 1 });
          } else {
            $("#callKeepIcon").attr("src", "img/tonghuabaochi1.png");
            $("#callKeepIcon").attr("title", "通话保持");
            $("#callKeep").css("color", "#009688");
            $("#callKeep").html("保持");
            $.cookie("agent", null);
            parent.layer.msg("恢复失败！", { icon: 7 });
          }
        },
      });
    }
  } else {
    parent.layer.msg("分机未在通话中！", { icon: 7 });
  }
}

// 通话转移事件
function transfer() {
  if (iscall == 1 && callId != "") {
    layer.open({
      type: 1,
      title: "通话转移",
      area: ["360px", "350px"],
      btn: ["保存", "取消"],
      content: $("#callTransferDiv"),
      shade: 0,
      resize: false,
      btn1: function (index, layero) {
        saveCallTransfer(index);
      },
      btn2: function (index, layero) {},
    });
  } else {
    parent.layer.msg("分机未在通话中！", { icon: 7 });
  }
}

// 保存转移
function saveCallTransfer(e) {
  var transferUser = $("#transferUser").val();
  $.ajax({
    url: callTransferUrl,
    type: "post",
    data: {
      callId: callId,
      transferUser: transferUser,
      extension: exten,
      company_id: company,
      sid: sid,
      appid: appid,
      token: token,
    },
    dataType: "json",
    success: function (msg) {
      if (msg.status) {
        parent.layer.msg(msg.info, { icon: 1 });
        layer.close(e);
      } else {
        parent.layer.msg(msg.info, { icon: 7 });
      }
    },
  });
}

// 设置
function setup() {
  var loginState = $("#ua-invite").val();
  if (loginState == "未登录" || $("#reg_form").css("display") == "block") {
    // location.reload();
    layer.open({
      type: 1,
      title: "设置",
      area: ["480px", "480px"],
      btn: ["保存", "取消"],
      content: $("#setupDiv"),
      shade: 0,
      resize: false,
      btn1: function (index, layero) {
        saveSetup(index);
      },
      btn2: function (index, layero) {},
    });
  } else {
    parent.layer.msg("请退出登录后，再设置！", { icon: 7 });
  }
}

// 保存设置
function saveSetup(e) {
  var company = $('input[name="company"]').val();
  var clientNumber = $('input[name="clientNumber"]').val();
  var httpServers = $('input[name="httpServers"]').val();
  $.ajax({
    url: httpServers,
    type: "get",
    data: { company: company, clientNumber: clientNumber },
    dataType: "json",
    success: function (msg) {
      console.log(msg);
      if (msg.status) {
        var htmlStr = "<option value=''>请选择</option>";
        if (msg.data.users.length > 0) {
          $.each(msg.data.users, function (i, v) {
            htmlStr +=
              "<option value='" +
              v.extension +
              "'>" +
              v.displayname +
              "(" +
              v.extension +
              ")</option>";
          });
        }
        exten = msg.data.exten;
        company = msg.data.company;
        clientNumber = msg.data.clientNumber;
        callRegister = msg.data.callRegister;
        callPopUrl = msg.data.callPopUrl;
        callStateUrl = msg.data.callStateUrl;
        sid = msg.data.sid;
        appid = msg.data.appid;
        token = msg.data.token;
        setStateUrl = msg.data.setStateUrl;
        callKeepUrl = msg.data.callKeepUrl;
        callTransferUrl = msg.data.callTransferUrl;
        parent.layer.close(e);
        parent.layer.msg("保存成功！", { icon: 1, time: 3000 }, function () {
          location.href =
            "index.html?exten=" +
            exten +
            "&company=" +
            company +
            "&clientNumber=" +
            clientNumber +
            "&callRegister=" +
            callRegister +
            "&callPopUrl=" +
            callPopUrl +
            "&callStateUrl=" +
            callStateUrl +
            "&sid=" +
            sid +
            "&appid=" +
            appid +
            "&token=" +
            token +
            "&setStateUrl=" +
            setStateUrl +
            "&callKeepUrl=" +
            callKeepUrl +
            "&callTransferUrl=" +
            callTransferUrl +
            "&htmlStr=" +
            htmlStr;
        });
      } else {
        parent.layer.msg(msg.info, { icon: 7 });
        return false;
      }
    },
    error: function () {
      parent.layer.msg("请求失败！", { icon: 7 });
      return false;
    },
  });
}

// 阻止被叫输入框回车提交事件
function ClearSubmit(e) {
  if (e.keyCode == 13) {
    return false;
  }
}

//话机业务逻辑========================================

var elements = {
  logForm: document.getElementById("reg_form"),
  logButton: document.getElementById("log"),
  ua: document.getElementById("ua"),
  uaStatus: document.getElementById("ua-status"),
  tishi: document.getElementById("pmsg"),
  newSessionForm: document.getElementById("new-session-form"),
  inviteCancelButton: document.getElementById("ua-invite"),
  callee_number: document.getElementById("callee_number"),
  input_callee: document.getElementById("input_callee"),
  unregisterButton: document.getElementById("ua-unregiter-button"),
  current_user: document.getElementById("reg_user_number"),
  show_status: document.getElementById("show_status"),
  acceptButton: document.getElementById("ua-accept-button"),
  rejectButton: document.getElementById("ua-reject-button"),
  audio: document.getElementById("audio"),
  sessionList: document.getElementById("session-list"),
  sessionTemplate: document.getElementById("session-template"),
};

var ua;
var sip_domain;
var sip_session;
//var sip_session;

var timer = {
  hour: 0,
  minute: 0,
  second: 0,
  timerid: 0,
};

var LogStat = {
  REG_SUCCESS: 0, //注册成功
  CONN_SUCCESS: 1,
  CONN_FAILED: 2,
  REG_FAILED: 3,
  REG_AUTH_FAILED: 4,
  CALL_IN: 5,
  OTHER: 99,
};

var CallStat = {
  CALL_ENDED: 0,
  PROGRESS_CALL: 1,
  ANSWER_CALL: 2,
  REJECT_CALL: 3,
  HANG_UP_CALL: 4,
  CANCEL_CALL: 5,
  BYE_CALL: 6,
  CALL_FAILED: 7,
  OTHER: 99,
};

/****************************************
 * 呼出请求回调函数
 * status_code: 回调状态码                INT
 *      callid：该呼叫的会话ID（或空）    STRING
 ***************************************/
function outbound_event_handle(status_code, callid) {
  switch (status_code) {
    case CallStat.PROGRESS_CALL: //呼叫进行中
      console.log("on_process===>>callid:%s", callid);
      elements.show_status.innerHTML = "呼叫中...";
      break;
    case CallStat.ANSWER_CALL: //呼叫应答
      console.log("on_accepted===>>");
      start_caculate_time();
      break;
    case CallStat.CALL_FAILED: //呼叫失败
      console.log("on_failed===>>");
      elements.show_status.innerHTML = "呼叫失败";
      elements.show_status.style.display = "block";
      stop_caculate_time();
      break;
    case CallStat.CALL_ENDED: //呼叫结束
      console.log("on_terminated===>>");
      stop_caculate_time();
      break;
    case CallStat.CANCEL_CALL: //被叫接通前主叫结束呼叫事件回调
      console.log("on_cancel===>>");
      break;
    case CallStat.BYE_CALL: //结束呼叫事件回调
      console.log("on_bye===>>callid: %s", callid);
      stop_caculate_time();
      break;
    default:
      console.log("unknown event: %d", status_code);
  }
}

/****************************************
 * 呼入请求回调函数
 * status_code: 回调状态码                INT
 *      incall：呼入的会话对象            Object
 ***************************************/
function inbound_event_handle(status_code, incall) {
  switch (status_code) {
    case CallStat.CALL_FAILED: //呼叫失败
      console.log("on_failed===>>");
      sessionUIs[incall.uri].inbound_status.textContent = "呼叫结束";
      sessionUIs[incall.uri].accept.style.backgroundColor = "#BEBEBE";
      sessionUIs[incall.uri].accept.disabled = "disabled";
      sessionUIs[incall.uri].reject.style.backgroundColor = "#BEBEBE";
      sessionUIs[incall.uri].reject.disabled = "disabled";
      stopRingTone(sessionUIs[incall.uri]);
      break;
    case CallStat.CALL_ENDED: //呼叫结束
      sessionUIs[incall.uri].accept.style.display = "none";
      sessionUIs[incall.uri].reject.style.display = "none";
      sessionUIs[incall.uri].close.style.display = "block";
      console.log("on_terminated===>>");
      break;
    case CallStat.CANCEL_CALL: //被叫接通前主叫结束呼叫事件回调
      console.log("on_cancel===>>");
      break;
    case CallStat.BYE_CALL: //呼叫挂机事件回调
      sessionUIs[incall.uri].inbound_status.textContent = "通话结束";
      sessionUIs[incall.uri].reject.style.backgroundColor = "#BEBEBE";
      sessionUIs[incall.uri].reject.disabled = "disabled";
      break;
    case CallStat.ANSWER_CALL: //结束呼叫事件回调
      sessionUIs[incall.uri].inbound_status.textContent = "通话中...";
      stopRingTone(sessionUIs[incall.uri]);
      break;
    default:
      console.log("unknown event: %d", status_code);
  }
}

/*
    REGISTER_SUCCESS: 0,
    CONNECT_SUCCESS: 1,
    CONNECT_FAILED: 2,
    REGISTER_FAILED: 3,
    REGISTER_AUTH_FAILED: 4,
    */
/**********************************
 * 连接注册服务请求回调函数
 * status_code: 回调状态码      INT
 *      message：回调的文本消息 STRING
 *********************************/
function log_event_handler(status_code, message) {
  switch (status_code) {
    case LogStat.CONN_SUCCESS:
      elements.tishi.innerText = "连接成功";
      return;
    case LogStat.CONN_FAILED:
      elements.tishi.innerText = "连接失败...";
      elements.tishi.style.display = "block";
      break;
    case LogStat.REG_SUCCESS:
      //注册成功再显示
      document.body.className = "started";
      console.log("======>>> registered");
      return;
    case LogStat.REG_FAILED:
      elements.tishi.innerText = "注册失败...";
      break;
    case LogStat.REG_AUTH_FAILED:
      elements.tishi.innerText = "鉴权失败...";
      break;
    default:
      console.log("未知错误码：%d", status_code);
      elements.tishi.innerText = "未知错误";
  }
  elements.tishi.style.backgroundColor = "#FFB5B5";
  elements.tishi.style.display = "block";
  return;
}

/*
    FREE_CALL: 0,   //空闲中
    RING_CALL: 5,   //被叫振铃
    ANSWER_CALL: 6, //被叫应答
    OVER_CALL: 4    //被叫接听超时
*/
/**********************************
 * 被叫状态监控回调函数
 * status_code: 回调状态码 INT
 * data：       回调的数据 obj
 *********************************/
function callee_event_handle(status_code, data) {
  switch (status_code) {
    case CalleeCode.FREE_CALL:
      console.log("===>>空闲中");
      break;
    case CalleeCode.RING_CALL:
      console.log("===>>被叫振铃中");
      secondReading(data);
      break;
    case CalleeCode.ANSWER_CALL:
      console.log("===>>被叫应答");
      secondReading(data);
      break;
    case CalleeCode.OVER_CALL:
      console.log("===>>被叫接听超时");
      secondReading(data);
      break;
    default:
      console.log("unknown event: %d", status_code);
  }
}

/*
    CONNECT_SUCCESS: 1, // websocket连接成功
    CONNECT_CLOSE:   2, // websocket连接关闭
    CONNECT_FAILED:  3  // websocket连接失败
*/
/**********************************
 * websocket连接回调函数
 * status_code: 回调状态码 INT
 * message：回调的文本消息 STRING
 *********************************/
function websocket_event_handle(status_code, message) {
  switch (status_code) {
    case WebSocketStatus.CONNECT_SUCCESS:
      console.log("===" + message + "===");
      break;
    case WebSocketStatus.CONNECT_CLOSE:
      console.log("===" + message + "===");
      break;
    case WebSocketStatus.CONNECT_FAILED:
      console.log("===" + message + "===");
      break;
    default:
      console.log("unknown event: %d", status_code);
  }
}

var config = {};
elements.logButton.addEventListener(
  "click",
  function (e) {
    var form,
      i,
      l,
      name,
      value,
      errflag = false;
    e.preventDefault();

    form = elements.logForm;

    elements.tishi.style.display = "none";

    // var config = {};
    for (i = 0, l = form.length; i < l; i++) {
      name = form[i].name;
      value = form[i].value;
      if (name !== "configSubmit" && value !== "") {
        if (name === "authorizationUser" && value === "") {
          elements.tishi.style.display = "block";
          elements.tishi.innerHTML = "用户名不能为空";
          errflag = true;
        } else if (name === "password" && value === "") {
          elements.tishi.style.display = "block";
          elements.tishi.innerHTML = "密码不能为空";
          errflag = true;
        } else if (name === "wsServers" && value === "") {
          elements.tishi.style.display = "block";
          elements.tishi.innerHTML = "设置不能为空";
          errflag = true;
        }
        config[name] = value;
      }
    }
    console.log(
      "======>>> %s %s %s ",
      config["authorizationUser"],
      config["password"],
      config["wsServers"],
      config["statusPushUrl"]
    );

    if (errflag) {
      elements.tishi.style.display = "block";
      elements.tishi.style.color = "white";
      elements.tishi.style.backgroundColor = "#FFB5B5";
      return;
    }

    /* 设置参数 */
    var options = {
      authorizationUser: config["authorizationUser"], //client_id
      password: config["password"], //client 密码
      wsServers: config["wsServers"], //注册服务器地址
      on_event: log_event_handler, //回调事件处理函数
      on_inbound: receive_incall, //呼入回调事件处理函数
    };

    /* 连接服务器 */
    UCSIPCC.login(options);

    /* 设置被叫状态监控配置参数 */
    var StatusPushConfig = {
      status_push_url: config["statusPushUrl"], // 被叫状态监控地址
      client_number: config["authorizationUser"], // sip账号
      callee_event: callee_event_handle, // 被叫状态事件回调
      websocket_event: websocket_event_handle, // websocket连接状态推送事件回调
    };
    /* 连接状态推送服务器 */
    StatusPush.init(StatusPushConfig);

    elements.tishi.style.display = "block";
    elements.tishi.style.color = "white";
    elements.tishi.style.backgroundColor = "#9AFF9A";
    elements.tishi.innerHTML = "登录中...";
    elements.current_user.innerHTML = config["authorizationUser"];
  },
  false
);

elements.unregisterButton.addEventListener(
  "click",
  function () {
    UCSIPCC.logout();
    location.reload();
  },
  false
);

//发起外呼请求
var start_call = function start_call_f(e) {
  e.preventDefault();
  e.stopPropagation();

  var callee = elements.callee_number.value;
  var reg = /^\d{0,16}$/;
  if (!callee) {
    console.log("--------\n参数错误：请填写不多于16的整数的被叫号码\n");
    elements.show_status.style.display = "block";
    elements.show_status.innerHTML = "请输入号码";
    return;
  }
  if (!reg.test(callee)) {
    console.log("--------\n参数错误：请填写不多于16的整数的被叫号码\n");
    elements.show_status.style.display = "block";
    elements.show_status.innerHTML = "号码格式错误";
    return;
  }
  elements.callee_number.value = "";
  var options = {
    renderHint: {
      remote: audio, //用于放音的<audio>标签必须设置，否则无法听到对端的声音
    },
    session_event: outbound_event_handle, //呼叫回调函数
  };

  //发起呼叫请求
  UCSIPCC.createNewCall(callee, options);

  elements.show_status.style.display = "block";
  elements.show_status.innerHTML = "处理中...";
  elements.input_callee.style.display = "none";
};

elements.inviteCancelButton.addEventListener("click", start_call, false);

var hang_up = function hang_up_f() {
  UCSIPCC.hangupOutCall();
};

//处理呼入请求
var sessionUIs = {};
function receive_incall(incall) {
  var tpl = elements.sessionTemplate;
  var node = tpl.cloneNode(true);
  var sessionUI = {};
  var messageNode;

  // Save a bunch of data on the sessionUI for later access
  sessionUI.node = node;
  sessionUI.displayName = node.querySelector(".display-name");
  sessionUI.inbound_status = node.querySelector(".inbound_status");
  sessionUI.accept = node.querySelector(".accept");
  sessionUI.reject = node.querySelector(".reject");
  sessionUI.close = node.querySelector(".close");
  sessionUI.audio = node.querySelector(".audio");
  sessionUI.ringtone = node.querySelector(".ringtone");
  sessionUI.renderHint = {
    remote: sessionUI.audio, //用于放音的<audio>标签必须设置，否则无法听到对端的声音
  };

  node.classList.remove("template");

  sessionUI.displayName.textContent = incall.displayName; // 呼入的用户名
  sessionUI.inbound_status.textContent = "正在呼入...";
  startRingTone(sessionUI);
  sessionUIs[incall.uri] = sessionUI;

  /* 设置呼入会话 */
  var options = {
    renderHint: sessionUI.renderHint, //用于媒体播放
    session_event: inbound_event_handle, //呼入会话状态回调函数
  };
  UCSIPCC.configInbound(incall, options);

  sessionUI.accept.addEventListener(
    "click",
    function () {
      sessionUIs[incall.uri].inbound_status.textContent = "已接听...";
      sessionUIs[incall.uri].accept.style.backgroundColor = "#BEBEBE";
      sessionUIs[incall.uri].accept.disabled = "disabled";
      sessionUIs[incall.uri].reject.value = "挂机";
      UCSIPCC.acceptCall(incall);
    },
    false
  );
  sessionUI.reject.addEventListener(
    "click",
    function () {
      sessionUIs[incall.uri].inbound_status.textContent = "正在挂机...";
      UCSIPCC.hangupInCall(incall);
    },
    false
  );
  sessionUI.close.addEventListener(
    "click",
    function () {
      elements.sessionList.removeChild(sessionUI.node);
    },
    false
  );
  elements.sessionList.appendChild(node);

  $(".accept").click();
}

function startRingTone(ui) {
  try {
    if (ui.ringtone) {
      ui.ringtone.play();
    }
  } catch (e) {}
}
function stopRingTone(ui) {
  try {
    if (ui.ringtone) {
      ui.ringtone.pause();
    }
  } catch (e) {}
}
function start_caculate_time() {
  elements.show_status.innerHTML = "";
  elements.show_status.style.display = "block";
  elements.show_status.innerHTML = "通话中：0:0:0";
  elements.input_callee.style.display = "none";

  elements.inviteCancelButton.removeEventListener("click", start_call, false);
  elements.inviteCancelButton.addEventListener("click", hang_up, false);
  elements.inviteCancelButton.style.backgroundColor = "#FF0000";
  elements.inviteCancelButton.value = "挂机";

  timer.timerid = setInterval(function () {
    if (timer.second == 60) {
      timer.minute++;
      if (timer.minute == 60) {
        timer.hour++;
      }
      timer.second = 0;
    }
    timer.second++;
    elements.show_status.innerHTML =
      "通话中：" + timer.hour + ":" + timer.minute + ":" + timer.second;
  }, 1000);
}

function stop_caculate_time() {
  elements.show_status.style.display = "none";
  elements.input_callee.style.display = "block";

  elements.inviteCancelButton.style.backgroundColor = "#41b48b";
  elements.inviteCancelButton.value = "呼叫";
  elements.inviteCancelButton.removeEventListener("click", hang_up, false);
  elements.inviteCancelButton.addEventListener("click", start_call, false);

  if (timer.timerid !== 0) {
    window.clearInterval(timer.timerid);
    timer.timerid = 0;
    timer.hour = 0;
    timer.minute = 0;
    timer.second = 0;
  }
}
