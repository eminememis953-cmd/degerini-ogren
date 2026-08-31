export default async function handler(req, res) {
   
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Sadece POST isteği kabul edilir."
    });
  }

  try {
    const { image, category } = req.body;

    if (!image) {
      return res.status(400).json({
        error: "Fotoğraf bulunamadı."
      });
    }
  
      
    

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY bulunamadı."
      });
    }

    const mimeMatch = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);

    const mimeType = mimeMatch
      ? mimeMatch[1]
      : "image/jpeg";

    const base64Data = image.includes(",")
      ? image.split(",")[1]
      : image;

    const prompt = `
Bu fotoğraftaki ${category || "ürünü"} dikkatlice incele.

Türkçe cevap ver.

Şunları belirt:
- Ürünün ne olduğu
- Görünen genel durumu
- İkinci el piyasasında yaklaşık değeri
- Tahmini fiyat aralığı

Kesin fiyat bildiğini iddia etme.
Kısa, anlaşılır ve kullanıcı dostu bir cevap ver.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                },
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API isteği başarısız oldu."
      });
    }

    const result =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("\n")
        .trim();

    if (!result) {
      return res.status(500).json({
        error: "Gemini cevap verdi ancak sonuç metni alınamadı."
      });
    }

    return res.status(200).json({
      result: result
    });

  } catch (error) {
    console.error("Sunucu hatası:", error);

    return res.status(500).json({
      error: error?.message || "Sunucuda beklenmeyen bir hata oluştu."
    });
  }
}
