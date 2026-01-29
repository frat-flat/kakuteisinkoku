import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
    // CORSヘッダー
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const formData = req.body;

        // DB保存処理について:
        // Supabase環境変数がある場合のみ保存を試み、失敗しても無視する実装などがありましたが、
        // Vercel環境変数未設定時に import そのものや初期化でクラッシュする可能性があるため、
        // シート反映を優先してDB保存処理はスキップ（コメントアウト）します。
        // 必要に応じて復活させてください。

        /*
        // -------------------------------------------------------------
        // 1. Prepare Data for Supabase (Sanitize)
        // -------------------------------------------------------------
        const dbData = {};
        Object.keys(formData).forEach(key => {
            const val = formData[key];
            if (val === '[SKIPPED]' || val === '') {
                dbData[key] = null;
            } else {
                dbData[key] = val;
            }
        });

        const { data, error } = await supabase.from('submissions').insert([{...}]);
        */

        // -------------------------------------------------------------
        // 2. Google Sheets Integration (GAS)
        // -------------------------------------------------------------
        // 以前のシート用のGAS URL
        const GAS_URL = 'https://script.google.com/macros/s/AKfycbwQlnLApAXOIR8ISOKYpa7EeXM0VuMGNlZjOc3sg4KTF61gdkcY8TokF7N9Xt-7dcWJ/exec';
        let gasSuccess = false;

        try {
            const gasRes = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (gasRes.ok) {
                gasSuccess = true;
            }
        } catch (gasError) {
            console.error('GAS Sync Error:', gasError);
            throw new Error('スプレッドシートへの通信に失敗しました');
        }

        // ---------------------------------------

        res.status(200).json({
            success: true,
            id: 'gas-submit', // DB IDはないので固定値
            message: '送信が完了しました'
        });
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({
            error: error.message,
            message: '送信に失敗しました。もう一度お試しください。'
        });
    }
}
