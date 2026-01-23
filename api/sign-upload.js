/**
 * =============================================================================
 * api/sign-upload.js - ファイルアップロード用署名付きURL生成API
 * =============================================================================
 * 
 * 【概要】
 * このファイルは、Supabase Storageへのファイルアップロードを安全に行うための
 * 署名付きURL（Signed URL）を生成するサーバーレス関数です。
 * 
 * 【処理フロー】
 * 1. フロントエンドからファイル名とファイルタイプを受け取る
 * 2. ファイル名をサニタイズ（特殊文字を除去）
 * 3. タイムスタンプを付けてユニークなパスを生成
 * 4. Supabase Storageで署名付きアップロードURLを作成
 * 5. 公開URLと署名付きURLをフロントエンドに返却
 * 
 * 【使用方法】
 * フロントエンドは返された signedUrl に対して PUT リクエストで
 * ファイルを直接アップロードします。アップロード後は publicUrl で
 * ファイルにアクセスできます。
 * 
 * 【エンドポイント】
 * POST /api/sign-upload
 * 
 * 【リクエスト形式】
 * Content-Type: application/json
 * Body: { fileName: "example.pdf", fileType: "application/pdf" }
 * 
 * 【レスポンス】
 * 成功: { signedUrl: "...", publicUrl: "..." }
 * 失敗: { error: "..." }
 * 
 * 【セキュリティ】
 * - 署名付きURLは一定時間のみ有効
 * - 直接ストレージのキーをクライアントに渡さない
 * 
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Initialize Supabase Client dynamically to catch config errors without crashing
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error(`Environment Configuration Error: SUPABASE_URL=${!!supabaseUrl}, SUPABASE_ANON_KEY=${!!supabaseKey}, ENV=${process.env.VERCEL_ENV}`);
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { fileName, fileType } = req.body;

        // Sanitize filename and make unique
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const path = `${Date.now()}_${sanitizedName}`;

        // Create Signed Upload URL
        // We use the Service Key (via supabase client initialized in lib) 
        // which has rights to generate this.
        const { data, error } = await supabase.storage
            .from('uploads')
            .createSignedUploadUrl(path);

        if (error) throw error;

        // Get Public URL for viewing later
        const { data: pubData } = supabase.storage
            .from('uploads')
            .getPublicUrl(path);

        res.status(200).json({
            signedUrl: data.signedUrl,
            publicUrl: pubData.publicUrl
        });

    } catch (e) {
        console.error('Upload error:', e);
        // Returns the actual error message to the browser
        res.status(500).json({ error: e.message });
    }
}
