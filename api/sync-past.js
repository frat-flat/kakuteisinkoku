import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
    // 誰でもアクセスできるように簡易的なCORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const GAS_URL = process.env.GAS_WEBHOOK_URL;
        if (!GAS_URL) {
            return res.status(400).json({ error: "GAS_WEBHOOK_URLがVercelの環境変数に設定されていません。登録後にRedeployを行ってください。" });
        }

        if (!supabase) {
            return res.status(500).json({ error: "Supabaseクライアントが初期化されていません。環境変数をご確認ください。" });
        }

        const { data: rows, error: dbError } = await supabase
            .from('submissions')
            .select('*')
            .order('created_at', { ascending: true });

        if (dbError) throw dbError;

        const results = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const formData = row.full_form_data;

            // GASへ送信
            const response = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const responseText = await response.text();
            
            results.push({
                index: i + 1,
                name: row.name,
                created_at: row.created_at,
                status: response.status,
                response: responseText.substring(0, 100)
            });

            // GASの制限回避のために少し待つ
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        return res.status(200).json({
            message: "過去データの同期処理が完了しました。",
            gas_url_used: GAS_URL.substring(0, 30) + "...", // セキュリティのため一部のみ表示
            total_synced: rows.length,
            results: results
        });

    } catch (error) {
        console.error("Sync API Error:", error);
        return res.status(500).json({
            error: error.message
        });
    }
}
