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
        let dbId = null;

        // -------------------------------------------------------------
        // 1. Prepare Data for Supabase (Sanitize)
        // -------------------------------------------------------------
        if (!supabase) {
            console.error('Supabase client not initialized');
            return res.status(500).json({ message: 'データベース設定が完了していないため、送信を完了できません。管理者にお問い合わせください。' });
        }

        const dbData = {};
        Object.keys(formData).forEach(key => {
            const val = formData[key];
            if (val === '[SKIPPED]' || val === '') {
                dbData[key] = null;
            } else {
                dbData[key] = val;
            }
        });

        // データベースに保存
        const { data, error } = await supabase
            .from('submissions')
            .insert([{
                // 基本情報
                name: dbData.fullName || null,
                name_kana: dbData.fullNameKana || null,
                // 全データをJSON形式で保存
                full_form_data: formData
            }])
            .select();

        if (error) {
            console.error('Supabase insert error:', error);
            throw new Error('データベースへの保存に失敗しました: ' + (error.message || JSON.stringify(error)));
        } else if (data && data[0]) {
            dbId = data[0].id;
        }

        // -------------------------------------------------------------
        // 2. Google Sheets Integration (GAS)
        // -------------------------------------------------------------
        // 以前のシート用のGAS URL
        const GAS_URL = process.env.GAS_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbwQlnLApAXOIR8ISOKYpa7EeXM0VuMGNlZjOc3sg4KTF61gdkcY8TokF7N9Xt-7dcWJ/exec';

        try {
            const gasRes = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!gasRes.ok) {
                throw new Error(`HTTP ${gasRes.status}`);
            }

            const gasResult = await gasRes.json().catch(() => ({}));
            if (gasResult.status === 'error') {
                throw new Error(`GASエラー: ${gasResult.message}`);
            }

        } catch (gasError) {
            console.error('GAS Sync Error:', gasError);
            throw new Error('スプレッドシートへの通信に失敗しました: ' + gasError.message);
        }
        // ---------------------------------------

        return res.status(200).json({ success: true, dbId: dbId });

    } catch (error) {
        console.error('Submit API Error:', error);
        res.status(500).json({
            error: error.message,
            message: error.message || '送信に失敗しました。もう一度お試しください。'
        });
    }
}
