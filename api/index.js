export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Sadece POST isteği kabul edilir."
    });
  }

  try {
    const { image, category } = req.body || {};

    if (!image) {
      return res.status(400).json({
        error: "Fotoğraf bulunamadı."
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: [{
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Bu fotoğraftaki ${category || "ürünü"} incele. Ürünün ne olduğunu, tahmini ikinci el piyasa değerini ve kısa açıklamasını Türkçe olarak yaz.`
            },
            {
              type: "input_image",
              image_url: image
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Analiz yapılamadı."
      });
    }

    return res.status(200).json({
      result: data.output_text || "Sonuç alınamadı."
    });

  } catch (error) {
    return res.status(500).json({
      error: "Bir hata oluştu."
    });
  }
}
