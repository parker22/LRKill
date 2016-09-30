document.ontouchmove = function (event) {
  event.preventDefault();
}
$(document).ready(function () {
  var socket = io();

  $("#second_view").hide();
  $("#enter_room").hide();

  //创建用户，隐藏第登陆界面，显示设置游戏配置界面
  $( "#enter_game" ).click(function() {
    var name = $("#player_name_input").val();


    socket.emit("joinserver", name);
    // if (name === "" || name.length < 2) {
    //   $("#errors").empty();
    //   $("#errors").append("Please enter a name");
    //   $("#errors").show();
    // } else {
    //   socket.emit("joinserver", name, device);
    //   toggleNameForm();
    //   toggleChatWindow();
    //   $("#msg").focus();
    // }
    $("#first_view").hide();
  $("#second_view").show();
});

  var player_info = {
    "p_name": null};
//创建房间
$( "#create_room" ).click(function() {
  var characters=[];
  _.forEach(info_kill.characters, function(value) {
    for (i = 0; i < value.c_num; i++) {
      characters.push(value.c_name);

    }
  });
  console.log(characters);

  socket.emit("createRoom", characters);
  $("#second_view").hide();
  $("#enter_room").show();
});

//创建游戏,需要人满开始button才能够被点击
  // if(){
  //
  // }
  // $( "#start_game" ).click(function() {
  //
  // });

  socket.on("update-user-status", function (status) {
    console.log(status);
    if (status.name != null) {
      player_info.p_name = status.name;
      $("#first_view").hide();
    $("#second_view").show();
    toastr.info('欢迎回到游戏'+status.name)
    }
  });
  var roomInfo = {};
  socket.on("update", function (room) {

    if (_.isEmpty(roomInfo)){
      roomInfo = room;

      var player_status = new Vue({
        el: '#player_status',
        data: roomInfo
      })
      console.log(player_status.characters);
    }

  });


  var info_kill = {

    "characters": [
      {
        "c_name": "wolf",
        "c_num": 2,
        "limit_num": false
      },
      {
        "c_name": "villager",
        "c_num": 0,
        "limit_num": false
      },
      {
        "c_name": "predictor",
        "c_num": 0,
        "limit_num": true
      },
      {
        "c_name": "witch",
        "c_num": 0,
        "limit_num": true
      },
      {
        "c_name": "huntsman",
        "c_num": 0,
        "limit_num": true
      }
    ]
  };

  var man_kill = new Vue({
    el: '#panda_kill',
    data: info_kill,
    computed: {
      totalNum: function () {
        return _.sumBy(this.characters, function (o) { return o.c_num; });
      }
    },
    methods: {
      minus: function (idx) {
        if (info_kill.characters[idx].c_num > 0) {
          info_kill.characters[idx].c_num--;
        }
      },
      add: function (idx) {
        if (info_kill.characters[idx].c_num >= 1) {
          if (!info_kill.characters[idx].limit_num) {
            info_kill.characters[idx].c_num++;
          }
        } else {
          info_kill.characters[idx].c_num++;
        }
      }
    }
  });
  var p_name = new Vue({
    el: '#player_n',
    data: {
      message: player_info
    }
  });
  var second_p_name = new Vue({
    el: '#second_view',
    data: {
      message: player_info
    }
  });
});
