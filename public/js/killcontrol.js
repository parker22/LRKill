// document.ontouchmove = function (event) {
//   event.preventDefault();
// }
$(document).ready(function () {
  //test footer

    var socket = io();
    $("#game-plaza-view").hide();
    $("#enter_room").hide();
  //  $("#night").hide();
    $("#guard").hide();
    $("#identify").hide();
    $("#wolves").hide();
    $("#predictor").hide();
    $("#witch").hide();
    var player_info = {
        "name": null,
        "owns":null,
        "inroom":null
    };

    var info_kill = {
        "position_nums": 8,
        "characters": [
            {
                "c_name": "wolf",
                "c_num": 3,
                "limit_num": false
            },
            {
                "c_name": "villager",
                "c_num": 3,
                "limit_num": false
            },
            {
                "c_name": "predictor",
                "c_num": 1,
                "limit_num": true
            },
            {
                "c_name": "witch",
                "c_num": 1,
                "limit_num": true
            },
            {
                "c_name": "huntsman",
                "c_num": 1,
                "limit_num": true
            },
            {
                "c_name": "idiot",
                "c_num": 0,
                "limit_num": true
            },
            {
                "c_name": "guard",
                "c_num": 0,
                "limit_num": true
            }
        ]
    };
    var userInfoVm = new Vue({
        el: '#user-info-panel',
        data:player_info
    })

    var man_kill = new Vue({
        el: '#panda_kill',
        data: info_kill,
        computed: {
            totalNum: function () {
                return _.sumBy(this.characters, function (o) {
                    return o.c_num;
                });
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
    var roomInfo = {};
    var player_status;
    var nameVm = new Vue({
        el: '#player_n',
        methods: {
            //创建用户，隐藏第登陆界面，显示设置游戏配置界面
            enterGame: function () {
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
                $("#game-plaza-view").show();
            }
        }
    });




    //创建房间
    $("#create_room").click(function () {
        var characters = [];
        _.forEach(info_kill.characters, function (value) {
            for (i = 0; i < value.c_num; i++) {
                characters.push(value.c_name);
            }
        });
        console.log(characters);
        socket.emit("createRoom", characters);
        $("#game-plaza-view").hide();
        $("#enter_room").show();
    });

    $("form").submit(function (event) {
        event.preventDefault();
    });
    //加入已有游戏
    $("#join-game").click(function () {

        $("#game-plaza-view").hide();
        $("#join-game-screen").show();
    });
    $("#joinGameForm").submit(function () {
        var roomNum = $("#room-num").val();

        if (roomNum === "") {
            toastr.error('Room number empty')
        } else {
            socket.emit("joinRoom", roomNum);
            $("#join-game-screen").hide();
            $("#enter_room").show();
        }
    });

    //创建游戏,需要人满开始button才能够被点击
    // if(){
    //
    // }

    $("#start_game").click(function () {
        $("#enter_room").hide();
        $("#identify").show();
    });
    socket.on("update-user-status", function (status) {

        if (status.name != null) {
            _.extend(player_info,status);
            $("#first_view").hide();
            if(status.inroom!=null){
                $("#enter_room").show();
            }else{
                $("#game-plaza-view").show();

            }
            toastr.info('欢迎回到游戏' + status.name)
        }
        console.log(userInfoVm.$data);

    });
    socket.on("update", function (status) {

        toastr.info(status)

    });

    socket.on("update-room-status", function (room) {

        if (_.isEmpty(roomInfo)) {
            _.extend(roomInfo ,room) ;

            player_status = new Vue({
                el: '#player_status',
                data: roomInfo,
                methods: {
                    sit: function (seatNum) {
                        socket.emit("sit", seatNum);
                        console.log("sit" + seatNum)
                    }
                }
            })
            console.log(player_status.$data);
        } else {
            _.extend(roomInfo ,room)
            console.log(player_status.$data);
        }

    });


    //进入确认身份界面，当看完身份点击确认时，界面进入天黑，并且开始游戏播放声音，播放完，开始守卫操作
    $("#identify_button").click(function () {
        $("#identify").hide();
        $("#night").show();
        var audio = document.createElement("audio");
        audio.src = "sounds/start_sound.mp3";
        audio.play();
        //这个地方需要修改，就是一个个人身份的判断，判断是不是守卫，是守卫的话，跳转守卫界面，不是的话就一直黑天
        if ("guard" == "guard") {
            setTimeout("$('#night').hide()", 19000);
            setTimeout("$('#guard').show()", 19005);
        }
    });

    //守卫操作完点击确认，开始播放声音：狼人请睁眼，播放完进入狼人界面
    $("#guard_confirm").click(function () {
        //这里修改第几个夜晚
        allPlayerInfo.round++;
        $("#guard").hide();
        $("#night").show();
        var audio = document.createElement("audio");
        audio.src = "sounds/start_sound.mp3";
        audio.play();
        //这个地方需要修改，就是一个个人身份的判断，判断是不是狼人，是狼人的话，跳转狼人界面，不是的话就一直黑天
        if ("wolves" == "wolves") {
            setTimeout("$('#night').hide()", 19000);
            setTimeout("$('#wolves').show()", 19005);
        }
    });
    //狼人操作完点击确认，开始播放声音：预言家请睁眼，播放完进入预言家界面
    $("#wolves_confirm").click(function () {
        $("#wolves").hide();
        $("#night").show();
        var audio = document.createElement("audio");
        audio.src = "sounds/start_sound.mp3";
        audio.play();
        //这个地方需要修改，就是一个个人身份的判断，判断是不是预言家，是预言家的话，跳转预言家界面，不是的话就一直黑天
        if ("predictor" == "predictor") {
            setTimeout("$('#night').hide()", 19000);
            setTimeout("$('#predictor').show()", 19005);
        }
    });
    //预言家操作完点击确认，开始播放声音：女巫请睁眼，播放完进入女巫界面
    $("#predictor_confirm").click(function () {
        $("#predictor").hide();
        $("#night").show();
        var audio = document.createElement("audio");
        audio.src = "sounds/start_sound.mp3";
        audio.play();
        //这个地方需要修改，就是一个个人身份的判断，判断是不是女巫，是女巫的话，跳转女巫界面，不是的话就一直黑天
        if ("witch" == "witch") {
            setTimeout("$('#night').hide()", 19000);
            setTimeout("$('#witch').show()", 19005);
            //这个地方还要加一段代码，判断女巫用没用解药和毒药，用了解药后，杀人信息会被隐藏，用了毒药后，毒人的button会被禁用

        }
    });
    $("#witch_confirm").click(function () {
        $("#witch").hide();
        $("#night").show();
        var audio = document.createElement("audio");
        audio.src = "sounds/start_sound.mp3";
        audio.play();
        //然后就到一开始的界面 天亮了
    });


    //服务器会给我的所有信息是这种格式被我提取
    var allPlayerInfo = {
        "round": 0,
        "today_killed_indx": 0,
        "position": [
            {
                "num": 1,
                "player_n": "sb",
                "player_p": "predictor",
                "isGuard": false,
                //没被杀用0表示，第一夜被杀用1表示，第二夜被杀用2表示（第几也被杀就用当此的夜数表示）
                "isKill": 0,
                "isSave": false,
                "isPosin": 0,
                "isDead": false,
                "isVoted": 0,
                "antidote": false,
                "poison": false
            },
            {
                "num": 2,
                "player_n": "sb",
                "player_p": "wolf",
                "isGuard": false,
                "isKill": 0,
                "isSave": false,
                "isPosin": 0,
                "isDead": false,
                "isVoted": 0,
                "antidote": false,
                "poison": false
            },
            {
                "num": 3,
                "player_n": "sb",
                "player_p": "guard",
                "isGuard": false,
                "isKill": 0,
                "isSave": false,
                "isPosin": 0,
                "isDead": false,
                "isVoted": 0,
                "antidote": false,
                "poison": false
            },
            {
                "num": 4,
                "player_n": "sb",
                "player_p": "witch",
                "isGuard": false,
                "isKill": 0,
                "isSave": false,
                "isPosin": 0,
                "isDead": false,
                "isVoted": 0,
                "antidote": false,
                "poison": false
            },
            {
                "num": 5,
                "player_n": "sb",
                "player_p": "huntsman",
                "isGuard": false,
                "isKill": 0,
                "isSave": false,
                "isPosin": 0,
                "isDead": false,
                "isVoted": 0,
                "antidote": false,
                "poison": false
            }

        ]
    };

    var kill_process = new Vue({
        el: '#panda_process',
        data: allPlayerInfo,
        methods: {
            //守卫的方法和逻辑，点一个按钮后 其他按钮变灰色 重置功能
            guard: function (index) {
                allPlayerInfo.position[index].isGuard = true;
                $(".guard_button").addClass("disabled");
                var num = index + 1;
                $("#guardbutton" + num).parents("#pos_id").css({"background-color": "green"});
            },
            guard_restart: function () {
                $(".guard_button").removeClass("disabled");
                $(".guard_button").parents("#pos_id").css({"background-color": "white"});
                for (var i = 0; i < allPlayerInfo.position.length; i++) {
                    if (allPlayerInfo.position[i].isGuard == true) {
                        allPlayerInfo.position[i].isGuard == false;
                    }
                }
            },
            //狼人的方法和逻辑，点一个按钮后 其他按钮变灰色 重置功能
            wolves: function (index) {
                allPlayerInfo.position[index].isKill = allPlayerInfo.round;
                var num = index + 1;
                allPlayerInfo.position.today_killed_indx = num;
                $(".wolves_button").addClass("disabled");
                $("#wolvesbutton" + num).parents("#pos_id").css({"background-color": "green"});
            },
            wolves_restart: function () {
                $(".wolves_button").removeClass("disabled");
                $(".wolves_button").parents("#pos_id").css({"background-color": "white"});
                for (var i = 0; i < allPlayerInfo.position.length; i++) {
                    if (allPlayerInfo.position[i].isKill == allPlayerInfo.round) {
                        allPlayerInfo.position[i].isKill == 0;
                        allPlayerInfo.position.today_killed_indx = 0;
                    }
                }
            },
            //预言家的方法和逻辑，点一个按钮后 其他按钮变灰色 重置功能
            predictor: function (index) {
                $(".predictor_button").addClass("disabled");
                var num = index + 1;
                $("#predictorbutton" + num).parents("#pos_id").css({"background-color": "green"});
                var idnt = allPlayerInfo.position[index].player_p;
                if (idnt == "wolf") {
                    alert("他是狼人");
                } else {
                    alert("他是好人");
                }
            },
            //预言家的方法和逻辑，点一个按钮后 其他按钮变灰色 毒人和救人
            witch: function (index) {
                $(".witch_button").addClass("disabled");
                var num = index + 1;
                $("#witchbutton" + num).parents("#pos_id").css({"background-color": "green"});
                allPlayerInfo.position[index].isPosin = allPlayerInfo.round;
            },
            witch_save: function (index) {
                $(".witch_button").addClass("disabled");
                var save_num = allPlayerInfo.today_killed_indx - 1;
                allPlayerInfo.position[save_num].isKill = 0;
            },
            witch_restart: function () {
                $(".witch_button").removeClass("disabled");
                $(".witch_button").parents("#pos_id").css({"background-color": "white"});
                if (allPlayerInfo.position[allPlayerInfo.today_killed_indx - 1].isKill == 0) {
                    allPlayerInfo.position[allPlayerInfo.today_killed_indx - 1].isKill == allPlayerInfo.round;
                } else {
                    for (var i = 0; i < allPlayerInfo.position.length; i++) {
                        if (allPlayerInfo.position[i].isPosin == allPlayerInfo.round) {
                            allPlayerInfo.position[i].isPosin == 0;
                        }
                    }
                }
            }
        }
    });



});
