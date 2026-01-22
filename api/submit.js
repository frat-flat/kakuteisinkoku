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

        // データベースに保存
        const { data, error } = await supabase
            .from('submissions')
            .insert([{
                // 基本情報
                name: formData.name || null,
                name_kana: formData.nameKana || null,
                dob: formData.dob || null,
                zip: formData.zip || null,
                address: formData.address || null,
                phone: formData.phone || null,
                email: formData.email || null,

                // 収入・申告情報
                income_type: formData.incomeType || null,
                blue_return: formData.blueReturn || null,
                past_filing: formData.pastFiling || null,
                etax_id: formData.etaxId || null,

                // 世帯・家族情報
                head_of_household: formData.headOfHousehold || null,
                relation_to_head: formData.relationToHead || null,
                marital_status: formData.maritalStatus || null,
                spouse_name: formData.spouseName || null,
                spouse_as_dependent: formData.spouseAsDependent || null,
                has_dependents: formData.hasDependents || null,
                dependent_count: formData.dependentCount ? parseInt(formData.dependentCount) : null,

                // 控除情報
                furusato_nozei: formData.furusatoNozei || null,
                medical_expenses: formData.medicalExpenses || null,

                // 銀行情報
                account_type: formData.accountType || null,
                bank_name: formData.bankName || null,
                branch_name: formData.branchName || null,
                account_number: formData.accountNumber || null,
                account_holder: formData.accountHolder || null,

                // 全データをJSON形式で保存
                full_form_data: formData
            }])
            .select();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        // --- Google Sheets Integration (GAS) ---
        const GAS_URL = 'https://script.google.com/macros/s/AKfycbz8MuYUeW6GWNRPhdournJxc0S9MlBcXlqt_h1kK2J9ymNJdtcRFqM2nkOonqDj-Sji/exec';

        try {
            // Transform data for GAS if needed, or send as is
            // GAS expects: { name, name_kana, etc... } matching the keys used in doPost
            // We use the flat fields we just prepared for Supabase insert, plus full_form_data for backup

            const gasPayload = {
                // Using the same keys as the rowData mapping in GAS
                name: formData.name,
                name_kana: formData.nameKana,
                dob: formData.dob,
                zip: formData.zip,
                address: formData.address,
                phone: formData.phone,
                email: formData.email,

                income_type: formData.incomeType,
                blue_return: formData.blueReturn,
                past_filing: formData.pastFiling,
                etax_id: formData.etaxId,

                head_of_household: formData.headOfHousehold,
                relation_to_head: formData.relationToHead,
                marital_status: formData.maritalStatus,
                spouse_name: formData.spouseName,
                spouse_as_dependent: formData.spouseAsDependent,
                has_dependents: formData.hasDependents,
                dependent_count: formData.dependentCount,

                furusato_nozei: formData.furusatoNozei,
                medical_expenses: formData.medicalExpenses,

                account_type: formData.accountType,
                bank_name: formData.bankName,
                branch_name: formData.branchName,
                account_number: formData.accountNumber,
                account_holder: formData.accountHolder,

                full_form_data: formData
            };

            await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gasPayload)
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
