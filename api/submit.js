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
