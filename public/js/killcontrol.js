// document.ontouchmove = function (event) {
//   event.preventDefault();
// }
$(document).ready(function () {
//确认

    var socket = io();
    $("#game-plaza-view").hide();
    $("#enter_room").hide();
    $("#night").hide();
    $("#guard").hide();
    $("#identify").hide();
    $("#wolf").hide();
    $("#predictor").hide();
    $("#witch").hide();
    $(".footer").hide();
    // $("#first_view").hide();

    var viewModels = ["witch","night","predictor","identify","wolf","guard","enter_room","game-plaza-view"]
    function playAudios(audioList) {
        var index = 1;
        var strings = audioList.split(" ");

        var audio = new Audio("sounds/" + strings[0] + ".mp3")
        audio.play();

        audio.onended = function () {
            if (index < strings.length) {
                audio.src = "sounds/" + strings[index] + ".mp3";
                setTimeout(function () {
                    audio.play();
                },50)
                index++;
            }
        };
    }
    var player_info = {
        "name": null,
        "owns": null,
        "inroom": null,
        "seatNum": null
    };
    var characterDict = {
        "wolf": "狼人",
        "villager": "村民",
        "predictor": "预言家",
        "witch": "女巫",
        "huntsman": "猎人",
        "Idiot": "白痴",
        "guard": "守卫"
    };

    var info_kill = {
        "position_nums": 8,
        "characters": [
            {
                "c_name": "wolf",
                "c_num": 1,
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
            },
            {
                "c_name": "idiot",
                "c_num": 0,
                "limit_num": true
            },
            {
                "c_name": "guard",
                "c_num": 1,
                "limit_num": true
            }
        ]
    };
    function ViewController(views) {
        this.views = views;
    }

    ViewController.prototype.onlyShow = function(view)
    {
        this.views.forEach(function(v) {
            $("#"+v).hide()
        });
        $("#"+view).show()
    };

    var viewController =  new ViewController(viewModels)

    var userInfoVm = new Vue({
        el: '#user-info-panel',
        data: player_info
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
                if(name != ""){
                  $("#first_view").hide();
                  $("body").css({'background-image':'url(../images/Secondpage.png)'});
                  $(".footer").show();
                  $("#user-info-panel").show();
                  $("#game-plaza-view").show();
                }else{
                  alert("请输入你的昵称");
                }
            }
        }
    });


    // userInfoVm.$watch('owns', function (newVal, oldVal) {
    //     console.log(newVal)
    //     if (newVal != null) {
    //         $("#start_game").show();
    //     }
    // });
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
        $("body").css({'background-image':'url(../images/Thirdpage1.png)'});
        $("#game-plaza-view").hide();
        $("#enter_room").show();

    });

    $("form").submit(function (event) {
        event.preventDefault();
    });
    //加入已有游戏
    $("#join-game").click(function () {
        $("body").css({'background-image':'url(../images/Thirdpage1.png)'});
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
    var kill_process;

    socket.on("update-user-status", function (status) {

        if (status.name != null) {
            _.extend(player_info, status);
            $("#first_view").hide();
            if (status.inroom != null) {
                if(kill_process!=null){
                    console.log("现在是"+ kill_process.room.step)
                    viewController.onlyShow(kill_process.room.step)
                }else $("#enter_room").show();
            } else {
                $("#game-plaza-view").show();

            }
        }
        console.log(userInfoVm.$data);

    });
    socket.on("update", function (status) {

        toastr.info(status)

    });

    Vue.component('confirmedPlayer-item', {
        template: '\
    <li>\
      {{ player }}\
    </li>\
  ',
        props: ['player']
    })
    socket.on("update-room-status", function (room) {

        if (_.isEmpty(roomInfo)) {
            _.extend(roomInfo, room);

            player_status = new Vue({
                el: '#player_status',
                data: roomInfo,
                computed: {
                    isOwner: function () {
                        return this.id == userInfoVm.owns;
                    }
                },
                methods: {
                    sit: function (seatNum) {
                        console.log(this.isOwner)
                        socket.emit("sit", seatNum);
                        console.log("sit" + seatNum)
                    },
                    startGame: function () {
                        $("#enter_room").hide();
                        $("body").css({'background-image':'url(../images/Fourthpage.png)'});
                        // $("#identify").show();
                        socket.emit("startGame");
                    },
                    initGame: function () {
                        $("#enter_room").hide();
                        $("body").css({'background-image':'url(../images/Fourthpage.png)'});
                        $("#identify").show();
                        kill_process = new Vue({
                            el: '#panda_process',
                            data: {
                                room: roomInfo,

                            },
                            methods: {
                                //确认身份
                                confirmIdentity: function () {
                                    socket.emit("confirmIdentity", userInfoVm.seatNum);
                                    $("#identify").hide();
                                    $("#room-info-panel").show();
                                },
                                startFirstNight: function () {
                                    socket.emit("startFirstNight");

                                },
                                // refreshPlayers: function () {
                                //     // _.each(this.room["confirmedPlayers"],function (player) {
                                //     //     this.confirmedPlayers.push(player)
                                //     // });
                                //     this.confirmedPlayers = _.union (this.confirmedPlayers,this.room["confirmedPlayers"])
                                //     console.log(this.confirmedPlayers)
                                // }
                                // //守卫的方法和逻辑，点一个按钮后 其他按钮变灰色 重置功能
                                guard: function (index) {
                                    console.log("想守卫" + index)
                                    //socket.emit("action", {action: "guard", detail: parseInt(index)});
                                    $(".overlay_image").hide();
                                    $("#guardhint" + index).show();
                                    // $("#guardbutton" + num).parents(".pos_box").css({"background-color": "green"});

                                },
                                guard_restart: function () {
                                    $(".guard_button").removeClass("disabled");
                                    $(".overlay_image").hide();
                                    for (var i = 0; i < allPlayerInfo.position.length; i++) {
                                        if (allPlayerInfo.position[i].isGuard == true) {
                                            allPlayerInfo.position[i].isGuard == false;
                                        }
                                    }
                                },
                                guardConfirm: function (index) {
                                  console.log("确定守卫" + index)
                                  socket.emit("action", {action: "guard", detail: parseInt(index)});
                                  setTimeout(function () {
                                      $("#guard").hide();
                                  }, 2000);
                                },
                                // //狼人的方法和逻辑，点一个按钮后 其他按钮变灰色 重置功能
                                wolves: function (index) {
                                    console.log("想杀害" + index)
                                    // $(".wolves_button").addClass("disabled");
                                    $(".overlay_image").hide();
                                    $("#wolveshint" + index).show();
                                    socket.emit("action", {action: "killChoice", detail: index});
                                },
                                wolvesDecision: function () {
                                    console.log("决定杀害" + this.killDecision)
                                    socket.emit("action", {action: "wolf", detail: this.killDecision});
                                },
                                wolves_restart: function () {
                                    $(".wolves_button").removeClass("disabled");
                                    $(".overlay_image").hide();
                                    // $(".wolves_button").parents("#pos_id").css({"background-color": "white"});
                                    for (var i = 0; i < allPlayerInfo.position.length; i++) {
                                        if (allPlayerInfo.position[i].isKill == allPlayerInfo.round) {
                                            allPlayerInfo.position[i].isKill == 0;
                                            allPlayerInfo.position.today_killed_indx = 0;
                                        }
                                    }
                                },
                                // //预言家的方法和逻辑，点一个按钮后 其他按钮变灰色 重置功能
                                predictorCheck: function (index) {
                                    $(".predictor_button").addClass("disabled");
                                    $("#predictorhint" + index).show();
                                    // $("#predictorbutton" + index).parents(".pos_box").css({"background-color": "green"});
                                    var idnt = this.room.characters[index].c_name;
                                    if (idnt == "wolf") {
                                        alert("他是坏人");
                                    } else {
                                        alert("他是好人");
                                    }
                                },
                                predictorConfirm: function () {
                                    socket.emit("action", {action: "predictor", detail: null});

                                },
                                // //预言家的方法和逻辑，点一个按钮后 其他按钮变灰色 毒人和救人
                                // witch: function (index) {
                                //     $(".witch_button").addClass("disabled");
                                //     var num = index + 1;
                                //     $("#witchbutton" + num).parents("#pos_id").css({"background-color": "green"});
                                //     allPlayerInfo.position[index].isPosin = allPlayerInfo.round;
                                // },
                                witchSave: function () {

                                    $(".witch_save").addClass("disabled");
                                    socket.emit("action", {action: "witchSave", detail: null});
                                },
                                witchPoison: function (index) {
                                    $(".overlay_image").hide();
                                    $("#witchhint" + index).show();
                                    socket.emit("action", {action: "witchPoison", detail: parseInt(index)});
                                },
                                //没写使用毒药按键的方法，逻辑是先点上面的号码，再点使用毒药，然后再点确认进入下一个界面
                                witchPoisonComfirmation: function(index){
                                  $(".witch_posion").addClass("disabled");
                                },
                                witchConfirm: function (index) {
                                    socket.emit("action", {action: "witch", detail: null});
                                },
                                // witch_restart: function () {
                                //     $(".witch_button").removeClass("disabled");
                                //     $(".witch_button").parents("#pos_id").css({"background-color": "white"});
                                //     if (allPlayerInfo.position[allPlayerInfo.today_killed_indx - 1].isKill == 0) {
                                //         allPlayerInfo.position[allPlayerInfo.today_killed_indx - 1].isKill == allPlayerInfo.round;
                                //     } else {
                                //         for (var i = 0; i < allPlayerInfo.position.length; i++) {
                                //             if (allPlayerInfo.position[i].isPosin == allPlayerInfo.round) {
                                //                 allPlayerInfo.position[i].isPosin == 0;
                                //             }
                                //         }
                                //     }
                                // }
                            },
                            // watch: {
                            //     // whenever question changes, this function will run
                            //     characters: function (chars) {
                            //         _.union (this.confirmedPlayers , _.map(_.filter(chars, function (o) {
                            //             return o.isIdentityConfirmed
                            //         }),'c_status'));
                            //         console.log(this.confirmedPlayers)
                            //     }
                            // },
                            computed: {
                                // a computed getter
                                c_name: function () {
                                    // `this` points to the vm instance
                                    // console.log(roomInfo.characters[userInfoVm.seatNum].c_name)
                                    return roomInfo.characters[userInfoVm.seatNum].c_name
                                },
                                c_caption: function () {
                                    // `this` points to the vm instance
                                    return characterDict[this.c_name]
                                },
                                confirmedPlayers: function () {

                                    return _.keys(_.pickBy(this.room.characters, function (v, k) {
                                        return v.isIdentityConfirmed == true;
                                    }));

                                },
                                isOwner: function () {
                                    return player_status.isOwner
                                },
                                killChoices: function () {
                                    var result = _.chain(this.room.killChoices)
                                        .groupBy("target")
                                        .toPairs()
                                        .map(function (currentItem) {
                                            return _.zipObject(["target", "wolves"], currentItem);
                                        })
                                        .value();
                                    console.log(result)
                                    return result
                                },
                                killDecision: function () {
                                    if (this.killChoices.length == 1) {
                                        return parseInt(this.killChoices[0].target)
                                    }
                                    else return 0
                                }

                            }
                        });

                    }
                }
            });
            socket.on("init-game", function () {
                player_status.initGame()
            });
            socket.on("execute-step", function (stepData) {
                console.log("execute-step-data", stepData)
                var step = stepData.step;
                var strings = stepData["audioList"].split(" ");
                var index = 1;
                var audio = new Audio("sounds/" + strings[0] + ".mp3")
                audio.play();

                audio.onended = function () {
                    if (index < strings.length) {
                        audio.src = "sounds/" + strings[index] + ".mp3";
                        setTimeout(function () {
                            audio.play();
                        }, 1)
                        index++;
                    }
                };


                //这个地方需要修改，就是一个个人身份的判断，判断是不是守卫，是守卫的话，跳转守卫界面，不是的话就一直黑天
                $("#night").show()
                $('#wolf').hide()
                $('#guard').hide()
                $('#predictor').hide()
                $('#witch').hide()
                if (step == "night") {
                    console.log("天黑了")
                    $("#room-info-panel").hide();
                    $('#confirmedPlayers').hide();
                    $("#night").show();
                }
                else if (step == "guard") {
                    console.log("守卫请睁眼")
                    if (kill_process.c_name == step) {
                        console.log("我是守卫")
                        setTimeout("$('#night').hide()", 500);
                        setTimeout("$('#guard').show()", 1000);
                    }
                }
                else if (step == "wolf") {
                    console.log("狼人请睁眼")
                    if (kill_process.c_name == step) {
                        console.log("我是狼人")
                        setTimeout("$('#night').hide()", 500);
                        setTimeout("$('#wolf').show()", 1000);
                    }
                }
                else if (step == "predictor") {
                    console.log("预言家请睁眼")
                    if (kill_process.c_name == step) {
                        console.log("我是预言家")
                        setTimeout("$('#night').hide()", 500);
                        setTimeout("$('#predictor').show()", 1000);
                    }
                }
                else if (step == "witch") {
                    console.log("女巫请睁眼")
                    if (kill_process.c_name == step) {
                        console.log("我是女巫")
                        setTimeout("$('#night').hide()", 500);
                        setTimeout("$('#witch').show()", 1000);
                    }
                }
                else if (step == "day") {
                    console.log("天亮了")
                    $("#room-info-panel").show();
                    setTimeout("$('#night').hide()", 500);

                }

            });
            console.log(player_status.$data);
        } else {
            _.extend(roomInfo, room);
            // if (kill_process != null) {
            //     kill_process.refreshPlayers()
            // }

            // var keys = [];
            // _.each(roomInfo.characters, function (char, key) {
            //
            //     if (char.isIdentityConfirmed) {
            //         keys.push(key);
            //     }
            // });
            console.log(player_status.$data);
        }

    });


    //进入确认身份界面，当看完身份点击确认时，界面进入天黑，并且开始游戏播放声音，播放完，开始守卫操作
    // $("#identify_button").click(function () {
    //     $("#identify").hide();
    //     $("#night").show();
    //     var strings = ("tianhei " + step + "_start").split(" ");
    //     var index = 1;
    //
    //     audio.src = "sounds/" + strings[0] + ".mp3";
    //     audio.play();
    //
    //     audio.onended = function () {
    //         if (index < strings.length) {
    //             audio.src = "sounds/" + strings[index] + ".mp3";
    //             audio.play();
    //             index++;
    //         }
    //     };
    //
    //
    //     //这个地方需要修改，就是一个个人身份的判断，判断是不是守卫，是守卫的话，跳转守卫界面，不是的话就一直黑天
    //     if ("guard" == "guard") {
    //         setTimeout("$('#night').hide()", 19000);
    //         setTimeout("$('#guard').show()", 19005);
    //     }
    // });

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
        $("#wolf").hide();
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


});
