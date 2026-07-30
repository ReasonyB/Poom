using UnityEngine;
using System.Runtime.InteropServices;
using UnityEngine.InputSystem;

public class NetworkManager : MonoBehaviour
{

    [DllImport("__Internal")]
    private static extern void ConnectToSignaling(string ServerUrl);

    [DllImport("__Internal")]
    private static extern void SendToWebRTC(string message); // 웹으로 패킷 전송 함수 활성화!

    [DllImport("__Internal")]
    private static extern string GetRoomIdFromURL(); // URL에서 RoomId를 가져오는 함수 활성화!

    [DllImport("__Internal")] private static extern void CreateRoomRequest();
    [DllImport("__Internal")] private static extern void JoinRoomRequest(string roomId);
    [DllImport("__Internal")] private static extern void SendOfferToRoom(string sdp, string roomId);
    [DllImport("__Internal")] private static extern void SendAnswerToRoom(string sdp, string roomId);
    [DllImport("__Internal")] private static extern void SendIceCandidateToRoom(string iceData, string roomId);


    private bool isP2PConnected = false;
    private string currentRoomId = "";

    void Start()
    {
        TextAsset configAsset = Resources.Load<TextAsset>("ServerConfig");

        if (configAsset == null)
        {
            Debug.LogError("ServerConfig resource not found!");
            return;
        }
        
        string serverUrl = configAsset.text.Trim();
        Debug.Log($"[C#] 읽어온 서버 주소: {serverUrl}");

#if UNITY_WEBGL && !UNITY_EDITOR
        Debug.Log("[C#] 웹GL 환경에서 네이밍 서버에 접속 시도 중...");
        ConnectToSignaling(serverUrl);
#endif

    }

    void Update()
    {
        // 🚨 테스트: 스페이스바를 누르면 HTML 클라이언트로 공격 패킷 발사!
        if (Keyboard.current != null && Keyboard.current.spaceKey.wasPressedThisFrame)
        {
            if (isP2PConnected)
            {
                string packet = "Unity_Attack_20";
                Debug.Log($"[C# 발송] {packet}");
#if UNITY_WEBGL && !UNITY_EDITOR
                SendToWebRTC(packet);
#endif
            }
            else
            {
                Debug.LogWarning("[C#] 아직 상대방과 P2P가 연결되지 않았습니다.");
            }
        }
    }

    public void OnServerConnected() { 
        Debug.Log("[C#] 🟢 네이밍 서버 접속 완료!"); 
        
        //Action 호출 할지 말지

        string roomIdFromURL = GetRoomIdFromURL();

        if(!string.IsNullOrEmpty(roomIdFromURL))
        {
            currentRoomId = roomIdFromURL;
            Debug.Log($"[C#] {roomIdFromURL}. 방에 입장합니다...");
            JoinRoomRequest(currentRoomId);
        }
        else
        {
            Debug.Log("[C#] URL에서 RoomId를 감지하지 못했습니다. 새로운 방을 생성합니다...");
            CreateRoomRequest();
        }
    }

    public void OnPeerJoined() { Debug.Log("[C#] 🟡 상대방 입장, 명함 교환 중..."); }

    // JS에서 P2P 통신이 완벽하게 뚫렸을 때 호출해주는 함수
    public void OnP2PConnected()
    {
        isP2PConnected = true;
        Debug.Log("[C#] 🔥 P2P 통신 개통 완료! 스페이스바를 눌러 패킷을 쏴보세요!");
    }

    public void OnReceivePacket(string payload)
    {
        Debug.Log("[C# 수신] 🔵 " + payload);
    }

    public void OnRoomCreated(string roomId)
    {
        currentRoomId = roomId;
        Debug.Log($"[C#] 방 생성 완료! RoomId: {roomId}");

        // 방 생성 후 브로드캐스트를 통해 인게임 제어 Action 호출
    }

    public void SendMyOffer(string myOfferSdp)
    {
        SendOfferToRoom(myOfferSdp, currentRoomId);
    }
}