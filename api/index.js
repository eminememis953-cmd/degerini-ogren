export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Sadece POST isteği kabul ediliyor."
    });
  }

  try {
    const { image, category } = req.body || {};

    if (!image) {
      return res.status(400).json({
        error: "Fotoğraf bulunamadı."
      });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY bulunamadı."
      });
    }

    const prompt = `
Bu fotoğraftaki ${category || "ürünü"} incele.

Türkçe cevap ver.

Şunları belirt:
- Ürünün ne olduğu
- Görünen genel durumu
- İkinci el piyasasında yaklaşık değeri
- Tahmini fiyat aralığı

Fiyatı Türk Lirası (TL) olarak belirt.
Kesin fiyat bildiğini iddia etme.
Fotoğraftan anlaşılmayan marka, model veya özellikleri uydurma.
Kısa, anlaşılır ve kullanıcı dostu cevap ver.
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
  role: "system",
  content: "Yanıtın tamamını yalnızca Türkçe ver. İngilizce açıklama, analiz veya 'The user wants...' gibi ifadeler yazma. Kullanıcıya doğrudan sonucu Türkçe ver."
},
    {          role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter API error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenRouter API isteği başarısız oldu."
      });
    }

    const result = data?.choices?.[0]?.message?.content;

    if (!result) {
      return res.status(500).json({
        error: "Yapay zekâdan cevap alınamadı."
      });
    }

    return res.status(200).json({
      result: result
    });

  } catch (error) {
    console.error("API error:", error);

    return res.status(500).json({
      error: "Yapay zekâya bağlanırken hata oluştu."
    });
  }
}
