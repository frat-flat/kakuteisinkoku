/**
 * =============================================================================
 * missing_functions.js - バリデーション関数リファレンス（参照用）
 * =============================================================================
 * 
 * 【概要】
 * このファイルは、開発中に使用されたバリデーション関数の参照コピーです。
 * 実際のアプリケーションでは script.js に同等の関数が含まれています。
 * 
 * 【注意】
 * このファイルは本番環境では読み込まれません。
 * デバッグや関数の確認用として保持されています。
 * 
 * 【含まれる関数】
 * - validatePhoneNumber(): 電話番号バリデーション（10桁/11桁チェック）
 * - validateEmail(): メールアドレス形式チェック
 * - validateKatakana(): 全角カタカナチェック
 * - getFieldLabel(): 入力フィールドのラベル取得
 * - getRadioGroupLabel(): ラジオボタングループのラベル取得
 * 
 * =============================================================================
 */

function validatePhoneNumber(val) {
    if (!val) return null;
    const clean = val.replace(/[^\d]/g, '');
    if (clean.length !== 10 && clean.length !== 11) {
        return {
            field: '電話番号',
            message: '電話番号は10桁または11桁で入力してください',
            example: '090-1234-5678'
        };
    }
    // Check prefix
    if (clean.length === 11) {
        if (!/^(090|080|070|050)/.test(clean)) {
            return {
                field: '電話番号',
                message: '携帯電話（090,080,070）またはIP電話（050）を入力してください',
                example: '090-1234-5678'
            };
        }
    } else if (clean.length === 10) {
        if (!clean.startsWith('0')) {
            return {
                field: '電話番号',
                message: '市外局番から入力してください',
                example: '03-1234-5678'
            };
        }
    }
    return null;
}

function validateEmail(input) {
    const val = input.value;
    if (!val) return null;
    // Simple regex
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        return {
            field: 'メールアドレス',
            message: '正しいメールアドレスの形式で入力してください',
            example: 'example@email.com'
        };
    }
    return null;
}

function validateKatakana(input) {
    const val = input.value;
    if (!val) return null;
    // Allow spaces
    if (!/^[\u30A0-\u30FF\s　]+$/.test(val)) {
        return {
            field: getFieldLabel(input),
            message: '全角カタカナで入力してください',
            example: 'ヤマダ タロウ'
        };
    }
    return null;
}

function getFieldLabel(input) {
    // Try to find label for this input
    const id = input.id;
    if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) {
            return label.innerText.replace('必須', '').trim();
        }
    }
    // Fallback: parent label or previous element label
    const parentLabel = input.closest('label');
    if (parentLabel) return parentLabel.innerText.replace('必須', '').trim();

    // Fallback: previous sibling label in form-group
    const formGroup = input.closest('.form-group');
    if (formGroup) {
        const label = formGroup.querySelector('label');
        if (label) return label.innerText.replace('必須', '').trim();
    }
    return 'この項目';
}

function getRadioGroupLabel(container, name) {
    const radio = container.querySelector(`input[name="${name}"]`);
    if (radio) {
        // Try to find a paragraph with question-label class in parent
        const formGroup = radio.closest('.form-group');
        if (formGroup) {
            const qLabel = formGroup.querySelector('.question-label');
            if (qLabel) return qLabel.innerText.replace('必須', '').trim();

            const label = formGroup.querySelector('label');
            if (label) return label.innerText.replace('必須', '').trim();
        }
    }
    return '選択項目';
}
