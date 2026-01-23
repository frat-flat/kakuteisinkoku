/**
 * =============================================================================
 * lib/supabase.js - Supabaseクライアント初期化
 * =============================================================================
 * 
 * 【概要】
 * このファイルは、Supabaseデータベースへの接続を確立するための
 * クライアントインスタンスを作成・エクスポートします。
 * 
 * 【環境変数】
 * このファイルは以下の環境変数を必要とします：
 * 
 * - SUPABASE_URL: Supabaseプロジェクトの URL
 *   例: https://xxxxx.supabase.co
 * 
 * - SUPABASE_ANON_KEY: 匿名キー（公開クライアント用）
 *   例: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * 【使用方法】
 * 他のファイルから以下のようにインポートして使用：
 * import { supabase } from '../lib/supabase.js';
 * 
 * const { data, error } = await supabase.from('table').select();
 * 
 * 【注意】
 * 環境変数が設定されていない場合、コンソールにエラーが出力されます。
 * Vercelデプロイ時は、プロジェクト設定で環境変数を設定してください。
 * 
 * =============================================================================
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL ERROR: Supabase environment variables are missing!');
    console.error('SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING');
    console.error('SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'MISSING');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
