/**
 * =============================================================================
 * toggleDepAddress_snippet.js - 扶養親族住所切替関数（スニペット）
 * =============================================================================
 * 
 * 【概要】
 * このファイルは、扶養親族の住所入力ブロックの表示/非表示を切り替える
 * 関数のコードスニペットです。
 * 
 * 【注意】
 * このファイルは本番環境では読み込まれません。
 * script.js に同等の関数が含まれています。
 * 開発時の参照用として保持されています。
 * 
 * 【機能説明】
 * toggleDepAddress(radio, isSeparate)
 * - radio: 選択されたラジオボタン要素
 * - isSeparate: true=別居（住所入力を表示）、false=同居（住所入力を非表示）
 * 
 * 【処理内容】
 * 1. ラジオボタンの次の兄弟要素から住所ブロックを取得
 * 2. 別居の場合：住所ブロックを表示し、入力を必須に設定
 * 3. 同居の場合：住所ブロックを非表示にし、入力値をクリア
 * 
 * =============================================================================
 */

function toggleDepAddress(radio, isSeparate) {
    const addressBlock = radio.closest('.form-group').nextElementSibling;
    if (!addressBlock || !addressBlock.classList.contains('dependent-address-block')) return;

    const inputs = addressBlock.querySelectorAll('input, select');

    if (isSeparate) {
        addressBlock.classList.remove('hidden');
        inputs.forEach(input => {
            // Building name is optional
            if (input.name && !input.name.includes('Building')) {
                input.required = true;
            }
        });
    } else {
        addressBlock.classList.add('hidden');
        // Clear values when hiding
        inputs.forEach(input => {
            input.value = '';
            input.required = false;
        });
    }
}
