using UnityEngine;

public class WaterRipple1 : MonoBehaviour
{
    [Header("물결이 흐르는 속도")]
    public float scrollSpeedX = 0.1f;
    public float scrollSpeedY = 0.1f;

    private Material waterMaterial;

    void Start()
    {
        // 캡슐의 머티리얼을 가져옵니다.
        waterMaterial = GetComponent<Renderer>().material;
    }

    void Update()
    { 
        float t = Time.time;
        // 시간에 따라 Offset 값을 계속 증가시킵니다.
        float offsetX =(0.015f * Mathf.Sin(t * 8.0f)) + (0.02f * Mathf.Cos(t * 11.3f));
        float offsetY = t * scrollSpeedY;

        // 머티리얼의 기본 텍스처(BaseMap) Offset을 업데이트합니다.
        waterMaterial.SetTextureOffset("_BaseMap", new Vector2(offsetX, -offsetY));
        // waterMaterial.SetVector("_ScrollSpeed", new Vector2(offsetX, -offsetY));
    }
}