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
        // 1. Prepare Data for Supabase (Sanitize) & Save
        // -------------------------------------------------------------
        if (supabase) {
            try {
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
                        dob: dbData.dob || null,
                        zip: dbData.zipCode || null,
                        address: (dbData.prefecture || '') + (dbData.address1 || '') + (dbData.address2 || ''),
                        phone: dbData.phone || null,
                        email: dbData.email || null,

                        // 収入・申告情報
                        income_type: dbData.incomeType || null,
                        blue_return: dbData.blueReturn || null,
                        past_filing: dbData.pastFiling || null,
                        etax_id: dbData.etaxId || null,

                        // 世帯・家族情報
                        head_of_household: dbData.isHead || null,
                        relation_to_head: dbData.headRelation || null,
                        marital_status: dbData.maritalStatus || null,
                        spouse_name: dbData.spouseName || null,
                        spouse_as_dependent: dbData.spouseAsDependent || null,
                        has_dependents: dbData.hasDependents || null,
                        dependent_count: (dbData.dependentCount && !isNaN(dbData.dependentCount)) ? parseInt(dbData.dependentCount) : null,

                        // 控除情報
                        furusato_nozei: dbData.furusatoCount ? 'あり' : null,
                        medical_expenses: dbData.medicalExpenses || null,

                        // 銀行情報
                        account_type: dbData.accountType || null,
                        bank_name: dbData.bankName || null,
                        branch_name: dbData.branchName || null,
                        account_number: dbData.accountNumber || null,
                        account_holder: dbData.accountHolder || null,

                        // 全データをJSON形式で保存
                        full_form_data: formData
                    }])
                    .select();

                if (error) {
                    console.error('Supabase error (continuing to GAS):', error);
                } else if (data && data[0]) {
                    dbId = data[0].id;
                }
            } catch (dbError) {
                console.error('Supabase unexpected error (continuing):', dbError);
            }
        } else {
            console.log('Supabase client not initialized (skipping DB save)');
        }

        // -------------------------------------------------------------
        // 2. Google Sheets Integration (GAS)
        // -------------------------------------------------------------
        // 以前のシート用のGAS URL
        const GAS_URL = 'https://script.google.com/macros/s/AKfycbwQlnLApAXOIR8ISOKYpa7EeXM0VuMGNlZjOc3sg4KTF61gdkcY8TokF7N9Xt-7dcWJ/exec';

        try {
            await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

        } catch (gasError) {
            console.error('GAS Sync Error:', gasError);
            // GASエラーでも、DB保存ができていれば成功扱いにすべきか？
            // 両方失敗ならエラーだが、片方成功なら成功とみなす。
            if (!dbId && !supabase) {
                // DBもなくGASも失敗ならエラー
                throw new Error('スプレッドシートへの通信に失敗しました');
            }
        }
        // ---------------------------------------

        res.status(200).json({
            success: true,
            id: dbId || 'gas-submit',
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
