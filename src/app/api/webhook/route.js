import { NextResponse } from 'next/server'
import axios from 'axios'

export async function POST(req) {
  // Kinukuha natin yung 'color' galing sa page.tsx
  const { webhookUrl, items, total, title, color } = await req.json()

  if (!webhookUrl) return NextResponse.json({ error: 'No webhook URL' }, { status: 400 })

  try {
    const embed = {
      title: title || "BLOX FRUIT STOCKS",
      // Pag walang color na pinasa, default na green (65280)
      color: color || 65280, 
      fields: [
        {
          name: "User Details",
          value: `\`\`\`md\nTotal: ${total}\nPAYMENT: GCASH\n\`\`\``,
          inline: false
        },
        {
          name: "Inventory:",
          value: `\`\`\`md\n${items || "..."}\n\`\`\``,
          inline: false
        }
      ],
      footer: {
        text: "Nero Stocks"
      },
      timestamp: new Date().toISOString()
    }

    await axios.post(webhookUrl, {
      embeds: [embed],
      username: "Nero Stocks BOT"
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}