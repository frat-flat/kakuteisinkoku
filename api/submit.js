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

        // -------------------------------------------------------------
        // 1. Prepare Data for Supabase (Sanitize)
        // -------------------------------------------------------------
        // Supabase specific fields need to be null if '[SKIPPED]' or empty
        // We iterate the incoming formData and create a clean version
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
                address: (dbData.prefecture || '') + (dbData.address1 || '') + (dbData.address2 || ''), // Combine for legacy DB field if needed, or store separate
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
                // Parse int only if valid number
                dependent_count: (dbData.dependentCount && !isNaN(dbData.dependentCount)) ? parseInt(dbData.dependentCount) : null,

                // 控除情報
                furusato_nozei: dbData.furusatoCount ? 'あり' : null, // Simplification for DB legacy column
                medical_expenses: dbData.medicalExpenses || null,

                // 銀行情報
                account_type: dbData.accountType || null,
                bank_name: dbData.bankName || null,
                branch_name: dbData.branchName || null,
                account_number: dbData.accountNumber || null,
                account_holder: dbData.accountHolder || null,

                // 全データをJSON形式で保存 (This is important for full backup)
                full_form_data: formData
            }])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        // -------------------------------------------------------------
        // 2. Google Sheets Integration (GAS)
        // -------------------------------------------------------------
        const GAS_URL = 'https://script.google.com/macros/s/AKfycbzdLj5dqxg6Xqegl8b36lH41iSzevOIqfFUvliRxLJ0_-NCDbriyTyocEY93brWg0cx/exec';

        try {
            // We send the ORIGINALLY collected formData which contains '[SKIPPED]'
            // GAS will handle the formatting to '-'
            await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

        } catch (gasError) {
            console.error('GAS Sync Error:', gasError);
            // Don't fail the main request
        }
        // ---------------------------------------

        res.status(200).json({
            success: true,
            id: data[0].id,
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
