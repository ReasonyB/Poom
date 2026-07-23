using UnityEngine;
using System.Runtime.InteropServices;
using UnityEngine.InputSystem;

public class NetworkManager : MonoBehaviour
{
#if UNITY_WEBGL && !UNITY_EDITOR
    [DllImport("__Internal")]
    private static extern void ConnectToSignaling(string ServerUrl);

    [DllImport("__Internal")]
    private static extern void SendToWebRTC(string message); // 웹으로 패킷 전송 함수 활성화!
#endif

    private bool isP2PConnected = false;

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

    public void OnServerConnected() { Debug.Log("[C#] 🟢 네이밍 서버 접속 완료!"); }

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
}