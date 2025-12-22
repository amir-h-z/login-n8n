import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const n8nResponse = await fetch('https://amirhosseinzeiny.app.n8n.cloud/webhook-test/8b6f7985-fa88-44d5-9f19-28b832b11163', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body),
        });

        // اگر آدرس اشتباه بود
        if (n8nResponse.status === 404) {
            return res.status(404).json({
                errors: { general: "Authentication service not found. Please try again." }
            });
        }

        const text = await n8nResponse.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = { message: text };
        }

        return res.status(n8nResponse.status).json(data);

    } catch (error: any) {
        // اگر سرور کلاً خاموش بود یا اینترنت نداشتید
        return res.status(503).json({
            errors: { general: "Server is unreachable. Please try again later." }
        });
    }
}