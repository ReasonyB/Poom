mergeInto(LibraryManager.library, {
  
  ConnectToSignaling: function (urlPtr) {
    var serverUrl = UTF8ToString(urlPtr);
    console.log("[JS] 유니티에서 받은 서버 주소:", serverUrl);

    console.log("[JS] 유니티 명령: 서버 및 P2P 접속 시도...");
    
    var script = document.createElement('script');
    script.src = "https://cdn.socket.io/4.5.4/socket.io.min.js";
    
    script.onload = function() {
        window.socket = io(serverUrl);
        const currentRoomId = "";
        
        window.peerConnection = null;
        window.dataChannel = null;
        const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

        // 1. 서버 접속 성공
        window.socket.on('connect', function() {
            console.log("[JS] 네이밍 서버 접속 성공!");
            SendMessage('NetworkManager', 'OnServerConnected');
        });

        window.socket.on('room_created' , function(roomId){
            window.currentRoomId = roomId;
            SendMessage('NetworkManager','OnRoomCreated', roomId);
        });
        
        window.socket.on('join_failed', function(reason){
            if (reason === "not_found" && window.isDevOp) {
                // 🚨 핵심: C#까지 안 가고 JS 선에서 컷! 바로 방 생성을 서버에 찔러넣습니다.
                console.log("🔥 [JS-Dev] 없는 방 번호입니다. 테스트를 위해 방을 강제로 생성합니다.");
                window.socket.emit('create_room'); 
            } 
            else {
                // Dev 모드가 아니거나(일반 유저), 꽉 찬 방(full)인 경우에만 C#으로 넘겨서 UI 띄우게 함
                SendMessage('NetworkManager', 'OnJoinFailed', reason);
            }
        });

        // 2. 상대방(HTML 또는 다른 유니티) 입장 시 -> 호스트 역할로 Offer 생성
        window.socket.on('peer_joined', async function() {
            console.log("[JS] 상대방 입장! P2P 명함(Offer) 생성 중...");
            SendMessage('NetworkManager', 'OnPeerJoined');
            
            window.peerConnection = new RTCPeerConnection(config);
            window.dataChannel = window.peerConnection.createDataChannel('gameData');
            setupDataChannel(window.dataChannel);
            setupIceCandidate();

            const offer = await window.peerConnection.createOffer();
            await window.peerConnection.setLocalDescription(offer);
            
            window.socket.emit('offer', offer, window.currentRoomId);
        });

        // 3. 상대방의 명함(Signal) 수신
        window.socket.on('offer', async function(offerData) {
            window.peerConnection = new RTCPeerConnection(config);
            setupIceCandidate();
            window.peerConnection.ondatachannel = function(event){
                window.dataChannel = event.channel;
                setupDataChannel(window.dataChannel);
            };

            await window.peerConnection.setRemoteDescription(new RTCSessionDescription(offerData));
            const answer = await window.peerConnection.createAnswer();
            await window.peerConnection.setLocalDescription(answer);
            window.socket.emit('answer', answer, window.currentRoomId);

        });

        window.socket.on('answer', async function(answerData){
            await window.peerConnection.setRemoteDescription(new RTCSessionDescription(answerData));
        });

        window.socket.on('ice_candidate', async function(iceData){
            await window.peerConnection.addIceCandidate(new RTCIceCandidate(iceData));
        });

        // 네트워크 경로(ICE) 탐색
        function setupIceCandidate() {
            window.peerConnection.onicecandidate = function(event) {
                if (event.candidate) {
                    window.socket.emit('ice_candidate',event.candidate, window.currentRoomId);
                }
            };
        }

        // P2P 채널 개통 완료 및 메시지 수신 이벤트
        function setupDataChannel(channel) {
            channel.onopen = function() {
                console.log("🔥 [JS] P2P 데이터 채널 개통 완료!");
                SendMessage('NetworkManager', 'OnP2PConnected'); // C#에 연결 완료 알림!
            };
            channel.onmessage = function(event) {
                SendMessage('NetworkManager', 'OnReceivePacket', event.data); // C#으로 패킷 토스!
            };
        }
    };
    document.head.appendChild(script);
  },

  // C#에서 호출해서 실제 P2P로 데이터를 쏘는 함수
  SendToWebRTC: function (strPtr) {
    var message = UTF8ToString(strPtr);
    if (window.dataChannel && window.dataChannel.readyState === 'open') {
        window.dataChannel.send(message);
        console.log("[JS] P2P 전송 완료:", message);
    } else {
        console.warn("[JS] 아직 P2P 채널이 열리지 않았습니다.");
    }
  },

  CreateRoomRequest: function(){
    if(window.socket){
        window.socket.emit('create_room');
    }
  },

  JoinRoomRequest: function(roomIdPtr){
    if(window.socket){
        var roomId = UTF8ToString(roomIdPtr);
        window.socket.emit('join_room', roomId);
    }
  },

  SendOfferToRoom: function(offerSdpPtr, roomIdPtr){
    if(window.socket){
        var offerData = UTF8ToString(offerSdpPtr);
        var roomId = UTF8ToString(roomIdPtr);
        window.socket.emit('offer', offerData, roomId);
    }
  },

  SendAnswerToRoom: function(answerSdpPtr, roomIdPtr){
    if(window.socket){
        var answerData = UTF8ToString(answerSdpPtr);
        var roomId = UTF8ToString(roomIdPtr);
        window.socket.emit('answer', answerData, roomId);
    }
  },

  SendIceCandidateToRoom: function(iceDataPtr, roomIdPtr){
    if(window.socket){
        var iceData = UTF8ToString(iceDataPtr);
        var roomId = UTF8ToString(roomIdPtr);
        window.socket.emit('ice_candidate', iceData, roomId);
    }
  }

});