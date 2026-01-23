/**
 * =============================================================================
 * temp_helper.js - 一時ヘルパー関数（参照用）
 * =============================================================================
 * 
 * 【概要】
 * このファイルは、開発中に使用されたヘルパー関数の参照コピーです。
 * 実際のアプリケーションでは script.js に同等の関数が含まれています。
 * 
 * 【注意】
 * このファイルは本番環境では読み込まれません。
 * デバッグや関数の確認用として保持されています。
 * 
 * 【含まれる関数】
 * - isConditionallyHidden(): 条件付き非表示判定
 *   - レビュー画面でデータ収集する際に、フォームステップが非表示なのか、
 *   - 条件分岐によって非表示なのかを区別するために使用
 * 
 * =============================================================================
 */

// ------------------------------------------------------------------
// UTILITY: Conditional Visibility Check for Data Collection
// ------------------------------------------------------------------
// This function determines if an element is hidden by LOGIC (e.g., conditional questions),
// while ignoring the visibility of the parent Step (which is hidden during Review).
function isConditionallyHidden(el) {
    const hiddenParent = el.closest('.hidden');
    if (!hiddenParent) return false;

    // If the closest hidden ancestor is a Form Step, it means the element is
    // physically hidden because we are on a different page, but LOGICALLY it is valid.
    if (hiddenParent.classList.contains('form-step')) {
        return false;
    }

    // Otherwise, it is hidden by a conditional group or internal logic.
    return true;
}
