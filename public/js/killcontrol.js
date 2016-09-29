document.ontouchmove = function(event){
    event.preventDefault();
}
$(document).ready(function () {
   var socket = io();



  $("#second_view").hide()
  $( "#enter_game" ).click(function() {
    var name = $("#player_name_input").val();
    var device = "desktop";
    if (navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) {
      device = "mobile";
    }
    socket.emit("joinserver", name, device);
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
  $( "#first_view" ).hide();

  $("#second_view").show()
});



  var player_info ={
    "p_name":""
  };
  var info_kill = {
    "position_nums": 8,
    "characters":[
      {
        "c_name":"wolf",
        "c_num":2,
        "limit_num":false
      },
      {
        "c_name":"villager",
        "c_num":0,
        "limit_num":false
      },
      {
        "c_name":"predictor",
        "c_num":0,
        "limit_num":true
      },
      {
        "c_name":"witch",
        "c_num":0,
        "limit_num":true
      },
      {
        "c_name":"huntsman",
        "c_num":0,
        "limit_num":true
      }
    ]
  };
  var man_kill = new Vue({
    el: '#panda_kill',
    data: info_kill,
    computed: {
      totalNum: function () {
        return _.sumBy(this.characters, function(o) { return o.c_num; });
      }
    },
    methods: {
      minus: function (idx) {
        if(info_kill.characters[idx].c_num>0){
            info_kill.characters[idx].c_num--;
        }
      },
      add: function (idx) {
        if(info_kill.characters[idx].c_num>=1){
          if(!info_kill.characters[idx].limit_num){
            info_kill.characters[idx].c_num++;
          }
        }else{
        info_kill.characters[idx].c_num++;
        }
      }
    }
  });
  var p_name = new Vue({
    el: '#player_n',
    data:{
      message:player_info
    }
  });
  var second_p_name = new Vue({
    el: '#second_view',
    data:{
      message:player_info
    }
  });

  const User = {
  template: `
    <div class="user">
      <h2>User {{ $route.params.id }}</h2>
      <router-view></router-view>
    </div>
  `
  };
  const UserHome = { template: '<div>Home</div>' }
  const router = new VueRouter({
  routes: [
    { path: '/user/:id', component: User,
      children: [
        // UserHome will be rendered inside User's <router-view>
        // when /user/:id is matched
        { path: '', component: UserHome },

      ]
    }
  ]
});
const app = new Vue({ router }).$mount('#app');
});
