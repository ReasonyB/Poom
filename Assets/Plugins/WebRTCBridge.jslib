mergeInto(LibraryManager.library, {
  
  ConnectToSignaling: function (urlPtr) {
    var serverUrl = UTF8ToString(urlPtr);
    console.log("[JS] 유니티에서 받은 서버 주소:", serverUrl);

    console.log("[JS] 유니티 명령: 서버 및 P2P 접속 시도...");
    
    var script = document.createElement('script');
    script.src = "https://cdn.socket.io/4.5.4/socket.io.min.js";
    
    script.onload = function() {
        window.socket = io(serverUrl);
        const roomName = 'water_battle_room';
        
        window.peerConnection = null;
        window.dataChannel = null;
        const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

        // 1. 서버 접속 성공
        window.socket.on('connect', function() {
            console.log("[JS] 네이밍 서버 접속 성공!");
            window.socket.emit('join_room', roomName);
            SendMessage('NetworkManager', 'OnServerConnected');
        });
        
        // 2. 상대방(HTML 또는 다른 유니티) 입장 시 -> 호스트 역할로 Offer 생성
        window.socket.on('user_joined', async function(userId) {
            console.log("[JS] 상대방 입장! P2P 명함(Offer) 생성 중...");
            SendMessage('NetworkManager', 'OnPeerJoined');
            
            window.peerConnection = new RTCPeerConnection(config);
            window.dataChannel = window.peerConnection.createDataChannel('gameData');
            setupDataChannel(window.dataChannel);
            setupIceCandidate();

            const offer = await window.peerConnection.createOffer();
            await window.peerConnection.setLocalDescription(offer);
            window.socket.emit('send_signal', { roomName: roomName, signalData: offer });
        });

        // 3. 상대방의 명함(Signal) 수신
        window.socket.on('receive_signal', async function(data) {
            const signalData = data.signalData;

            if (!window.peerConnection) {
                window.peerConnection = new RTCPeerConnection(config);
                setupIceCandidate();
                window.peerConnection.ondatachannel = function(event) {
                    window.dataChannel = event.channel;
                    setupDataChannel(window.dataChannel);
                };
            }

            if (signalData.type === 'offer' || signalData.type === 'answer') {
                await window.peerConnection.setRemoteDescription(new RTCSessionDescription(signalData));
                if (signalData.type === 'offer') {
                    const answer = await window.peerConnection.createAnswer();
                    await window.peerConnection.setLocalDescription(answer);
                    window.socket.emit('send_signal', { roomName: roomName, signalData: answer });
                }
            } else if (signalData.candidate) {
                await window.peerConnection.addIceCandidate(new RTCIceCandidate(signalData));
            }
        });

        // 네트워크 경로(ICE) 탐색
        function setupIceCandidate() {
            window.peerConnection.onicecandidate = function(event) {
                if (event.candidate) {
                    window.socket.emit('send_signal', { roomName: roomName, signalData: event.candidate });
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
  }
});