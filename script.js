// State tracking
let currentStepIndex = 0;
const steps = [
    'section-a', // 0: Basic Info
    'section-b', // 1: Income Type
    'section-termination', // 2: Fallback
    'section-c', // 3: Contact
    'section-f', // 4: Family & Household
    'section-d', // 5: Income Details (Conditional)
    'section-g', // 6: Deductions
    'section-h', // 7: Bank
    'section-review', // 8: Review Input
    'section-accountant', // 9: Tax Accountant Info
    'section-i', // 10: Final Consent & Submit
    'section-j'  // 11: Completion
];

// Logic History Stack
let stepHistory = [0];

document.addEventListener('DOMContentLoaded', () => {
    updateProgressBar();
    createErrorModal();
    setupInputListeners();

    // Listeners for conditional logic
    document.querySelectorAll('input[name="addressJan1"]').forEach(radio => {
        radio.addEventListener('change', (e) => toggleJan1Address(e.target.value));
    });

    // Terms Scroll Listener
    const termsBox = document.querySelector('.terms-box');
    const agreementCheckbox = document.getElementById('agreement');
    const submitBtn = document.getElementById('submitBtn');

    if (termsBox && agreementCheckbox) {
        termsBox.addEventListener('scroll', () => {
            // Check if scrolled to bottom
            if (Math.abs(termsBox.scrollHeight - termsBox.scrollTop - termsBox.clientHeight) < 2) {
                agreementCheckbox.disabled = false;
            }
        });

        agreementCheckbox.addEventListener('change', () => {
            submitBtn.disabled = !agreementCheckbox.checked;
        });
    }

    // Initialize Banking Data (Fetch or Mock)
    // Initialize Banking Data (Fetch or Mock)
    initBankingData();

    // Set Max Date for all date inputs to Today and add validation
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.max = today;
        // Add validation handler to enforce no future dates
        input.addEventListener('change', function () {
            if (this.value > today) {
                alert('未来の日付は選択できません。');
                this.value = '';
            }
        });
    });

    // Auto-Save/Load
    initAutoSave();

    // File Upload Setup
    setupFileUploads();
});

// Format Phone Number on Blur
// Format Phone Number on Blur
function formatPhone(input) {
    let val = input.value.trim().replace(/[^\d]/g, '');
    if (!val) return;

    // Use libphonenumber-js if available
    if (typeof libphonenumber !== 'undefined') {
        try {
            // Parse as JP number
            const phoneNumber = libphonenumber.parsePhoneNumber(val, 'JP');
            if (phoneNumber) {
                // Determine format
                // National format is usually 03-1234-5678
                const formatted = phoneNumber.format('NATIONAL');
                input.value = formatted;
                input.classList.remove('input-error');
                return;
            }
        } catch (e) {
            // Fallback if strictly invalid but maybe typable?
            // Just leave it or try manual fallback
            console.log('Phone format error', e);
        }
    }

    // Manual Fallback if library missing or fails
    if ((val.length === 10 || val.length === 11) && val.startsWith('0')) {
        if (val.length === 11) {
            input.value = `${val.substring(0, 3)}-${val.substring(3, 7)}-${val.substring(7)}`;
        } else {
            // Basic fallback without area code logic
            input.value = `${val.substring(0, 3)}-${val.substring(3, 6)}-${val.substring(6)}`;
        }
    }
}

// Handle Zip Input (Auto-address)
// Format Zip on Blur
function formatZip(input) {
    let val = input.value.replace(/[^\d]/g, '');
    if (val.length === 7) {
        input.value = `${val.substring(0, 3)}-${val.substring(3)}`;
        input.classList.remove('input-error');
    }
}

// Handle Zip Input (Auto-address)
async function handleZipInput(input) {
    // 1. Get raw digits for API
    let val = input.value.replace(/[^\d]/g, '');

    // 2. Clear previous errors (if typing)
    if (val.length > 0) {
        input.classList.remove('input-error');
        const existingError = input.parentNode.querySelector('.inline-error-message');
        if (existingError) existingError.textContent = '';
    }

    // 3. API Call on 7 digits
    if (val.length === 7) {
        // Determine target fields
        let prefInput = null;
        let cityInput = null;

        const name = input.name;

        if (name === 'zipCode') {
            prefInput = document.querySelector('#prefecture');
            cityInput = document.querySelector('#address1');
        } else if (name === 'jan1Zip') {
            prefInput = document.querySelector('[name="jan1Pref"]');
            cityInput = document.querySelector('[name="jan1City"]');
        } else if (name === 'spouseZip') {
            prefInput = document.querySelector('[name="spousePref"]');
            cityInput = document.querySelector('[name="spouseCity"]');
        } else if (name.startsWith('depZip_')) {
            const suffix = name.split('_')[1];
            prefInput = document.querySelector(`[name="depPref_${suffix}"]`);
            cityInput = document.querySelector(`[name="depCity_${suffix}"]`);
        }

        if (!prefInput || !cityInput) return;

        try {
            const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${val}`);
            const data = await res.json();

            if (data && data.results) {
                const result = data.results[0];
                const pref = result.address1;
                const addr = result.address2 + result.address3;

                prefInput.value = pref;
                cityInput.value = addr;

                prefInput.classList.remove('input-error');
                cityInput.classList.remove('input-error');

                // Auto-format the zip input now that we have success
                input.value = `${val.substring(0, 3)}-${val.substring(3)}`;
            } else {
                if (data.status === 200 && data.results === null) {
                    alert('入力された郵便番号は存在しません。正しい番号を確認してください。');
                    input.classList.add('input-error');
                }
            }
        } catch (e) {
            console.error('Address fetch failed', e);
        }
    }
}

function initAutoSave() {
    // Load saved data with confirmation
    const savedData = localStorage.getItem('taxReturnFormData');
    if (savedData) {
        // Delay slightly to ensure UI is ready
        setTimeout(() => {
            if (confirm('保存されたデータが見つかりました。\n続きから入力を再開しますか？\n\n「OK」：保存されたデータを復元して再開\n「キャンセル」：データを削除して最初から作成')) {
                try {
                    const data = JSON.parse(savedData);
                    restoreFormData(data);
                } catch (e) {
                    console.error('Failed to load saved data', e);
                    localStorage.removeItem('taxReturnFormData');
                }
            } else {
                localStorage.removeItem('taxReturnFormData');
                // Optional: Reload to ensure clean state if needed, but fields are empty by default
                location.reload();
            }
        }, 100);
    }

    // Save on change
    document.body.addEventListener('change', saveProgress);
    document.body.addEventListener('input', (e) => {
        // Debounce input saving
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            saveProgress();
        }
    });
}

function restoreFormData(data) {
    Object.keys(data).forEach(key => {
        const input = document.querySelector(`[name="${key}"]`);
        if (input) {
            if (input.type === 'radio') {
                const radio = document.querySelector(`input[name="${key}"][value="${data[key]}"]`);
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else if (input.type === 'checkbox') {
                // Checkbox array handling
                if (Array.isArray(data[key])) {
                    const cb = document.querySelector(`input[name="${key}"][value="${input.value}"]`);
                    // Logic for multiple checkboxes with same name is tricky with querySelector
                    // Use querySelectorAll for checkbox groups
                    document.querySelectorAll(`input[name="${key}"]`).forEach(cb => {
                        if (data[key].includes(cb.value)) {
                            cb.checked = true;
                            cb.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                } else if (input.value === data[key] || data[key] === true) { // Single boolean checkbox
                    input.checked = true;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else if (input.type !== 'file') {
                input.value = data[key];
                input.dispatchEvent(new Event('input', { bubbles: true }));
                // For logic dependent fields like dependentCount
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    });
}

function saveProgress() {
    const data = {};
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type === 'file') return; // Cannot save files
        if (input.name) {
            if (input.type === 'radio') {
                if (input.checked) data[input.name] = input.value;
            } else if (input.type === 'checkbox') {
                if (!data[input.name]) data[input.name] = [];
                if (input.checked) data[input.name].push(input.value);
            } else {
                data[input.name] = input.value;
            }
        }
    });
    localStorage.setItem('taxReturnFormData', JSON.stringify(data));
}

// Banking Data Logic
async function initBankingData() {
    try {
        const response = await fetch('https://zengin-code.github.io/api/banks.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const banks = await response.json();

        window.REAL_BANKS = banks; // Store raw data
        console.log('Bank API loaded successfully:', Object.keys(banks).length, 'banks');

        // Override handleBankChange to use API
        window.useRealApi = true;

    } catch (error) {
        console.warn('Banking API failed, falling back to Mock:', error);
        // Fallback to mock data for common banks
        window.REAL_BANKS = {
            "0001": { code: "0001", name: "みずほ銀行", kana: "ミズホ", hira: "みずほ", roma: "mizuho" },
            "0005": { code: "0005", name: "三菱UFJ銀行", kana: "ミツビシユーエフジェイ", hira: "みつびしゆーえふじぇい", roma: "mufg" },
            "0009": { code: "0009", name: "三井住友銀行", kana: "ミツイスミトモ", hira: "みついすみとも", roma: "smbc" },
            "0010": { code: "0010", name: "りそな銀行", kana: "リソナ", hira: "りそな", roma: "resona" },
            "0017": { code: "0017", name: "埼玉りそな銀行", kana: "サイタマリソナ", hira: "さいたまりそな", roma: "saitamaresona" },
            "0033": { code: "0033", name: "ジャパンネット銀行", kana: "ジャパンネット", hira: "じゃぱんねっと", roma: "japannet" },
            "0034": { code: "0034", name: "セブン銀行", kana: "セブン", hira: "せぶん", roma: "seven" },
            "0035": { code: "0035", name: "ソニー銀行", kana: "ソニー", hira: "そにー", roma: "sony" },
            "0036": { code: "0036", name: "楽天銀行", kana: "ラクテン", hira: "らくてん", roma: "rakuten" },
            "0038": { code: "0038", name: "住信SBIネット銀行", kana: "スミシンエスビーアイネット", hira: "すみしんえすびーあいねっと", roma: "sbi" },
            "0039": { code: "0039", name: "auじぶん銀行", kana: "エーユージブン", hira: "えーゆーじぶん", roma: "aujibun" },
            "0040": { code: "0040", name: "イオン銀行", kana: "イオン", hira: "いおん", roma: "aeon" },
            "0116": { code: "0116", name: "北海道銀行", kana: "ホッカイドウ", hira: "ほっかいどう", roma: "hokkaido" },
            "0117": { code: "0117", name: "青森銀行", kana: "アオモリ", hira: "あおもり", roma: "aomori" },
            "0130": { code: "0130", name: "七十七銀行", kana: "シチジュウシチ", hira: "しちじゅうしち", roma: "77" },
            "0138": { code: "0138", name: "秋田銀行", kana: "アキタ", hira: "あきた", roma: "akita" },
            "0140": { code: "0140", name: "山形銀行", kana: "ヤマガタ", hira: "やまがた", roma: "yamagata" },
            "0147": { code: "0147", name: "群馬銀行", kana: "グンマ", hira: "ぐんま", roma: "gunma" },
            "0149": { code: "0149", name: "足利銀行", kana: "アシカガ", hira: "あしかが", roma: "ashikaga" },
            "0150": { code: "0150", name: "常陽銀行", kana: "ジョウヨウ", hira: "じょうよう", roma: "joyo" },
            "0151": { code: "0151", name: "筑波銀行", kana: "ツクバ", hira: "つくば", roma: "tsukuba" },
            "0133": { code: "0133", name: "武蔵野銀行", kana: "ムサシノ", hira: "むさしの", roma: "musashino" },
            "0134": { code: "0134", name: "千葉銀行", kana: "チバ", hira: "ちば", roma: "chiba" },
            "0135": { code: "0135", name: "千葉興業銀行", kana: "チバコウギョウ", hira: "ちばこうぎょう", roma: "chibakogyo" },
            "0137": { code: "0137", name: "東京都民銀行", kana: "トウキョウトミン", hira: "とうきょうとみん", roma: "tokyotomin" },
            "0152": { code: "0152", name: "横浜銀行", kana: "ヨコハマ", hira: "よこはま", roma: "yokohama" }
        };
        window.useRealApi = false;
        console.log('Using mock bank data:', Object.keys(window.REAL_BANKS).length, 'banks');
    }
}

// Setup input listeners for Enter key and blur validation
// Setup input listeners for Enter key and blur validation
function setupInputListeners() {
    document.querySelectorAll('input, select').forEach(input => {
        if (input.dataset.listenersAttached === 'true') return;
        input.dataset.listenersAttached = 'true';

        // Enter key to move to next field
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                moveToNextInput(input);
            }
        });

        // Blur validation for text inputs with regex
        if (input.type === 'text' || input.type === 'tel' || input.type === 'email') {
            input.addEventListener('blur', () => {
                // Normalize Input on Blur
                let val = input.value;
                if (!val) return;

                // 1. Normalize Alphanumeric (Full -> Half) for specific fields
                // Fields: Zip, Phone, MyNumber, AccountNumber, Email, Income
                if (input.name.includes('zip') || input.name.includes('phone') || input.name.includes('Phone') ||
                    input.name.toLowerCase().includes('mynumber') || input.name.includes('Money') ||
                    input.name === 'accountNumber' || input.name === 'incomeAmount') {
                    input.value = toHalfWidth(val);
                }

                // 2. Normalize Kana (Half -> Full) for specific fields
                // Fields: Kana, AccountHolder
                if (input.name.includes('Kana') || input.name === 'accountHolder') {
                    input.value = toFullWidthKana(val);
                }

                // 3. Trim spaces? User said spacing doesn't matter, so let's keep it clean but allow it.
                // Actually validateKatakana should ignore spaces.

                if (input.value.trim()) { // Only validate if has value
                    validateSingleInput(input);
                }
            });
        }

        // Feature: Phone Formatting
        if (input.name.toLowerCase().includes('phone') || input.type === 'tel') {
            input.addEventListener('blur', () => formatPhone(input));
        }

        // Feature: Zip Code Auto-fill & Format
        if (input.name.toLowerCase().includes('zip')) {
            input.addEventListener('input', () => handleZipInput(input));
            input.addEventListener('blur', () => formatZip(input));
        }
        // Feature: MyNumber Confirmation Match
        if (input.name.toLowerCase().includes('mynumberconfirm')) {
            input.addEventListener('input', () => {
                // Heuristic: Remove 'Confirm' from ID or Name to find original
                let originalId = input.id.replace('Confirm', '');
                validateMyNumberMatch(originalId, input.id);
            });
        }
    });

    // Instant My Number Validation - DEPRECATED: Handled dynamically above
    // Code removed to prevent duplication and allow dynamic fields to work automatically

}

function validateMyNumberMatch(originalId, confirmId) {
    const original = document.getElementById(originalId);
    const confirm = document.getElementById(confirmId);
    const errorSpanId = confirmId + '-error';

    let errorSpan = document.getElementById(errorSpanId);
    if (!errorSpan) {
        errorSpan = document.createElement('div');
        errorSpan.id = errorSpanId;
        errorSpan.className = 'inline-error-message';
        errorSpan.style.color = 'red';
        errorSpan.style.fontSize = '12px';
        errorSpan.style.marginTop = '4px';
        confirm.closest('.password-wrapper').after(errorSpan);
    }

    if (confirm.value && original.value) {
        if (confirm.value.length === 12 && original.value.length === 12) {
            if (confirm.value !== original.value) {
                errorSpan.textContent = '入力されたマイナンバーと一致しません（入力内容をリセットしました）';
                confirm.classList.add('input-error');
                // Reset both values as requested
                confirm.value = '';
                original.value = '';
            } else {
                errorSpan.textContent = '';
                confirm.classList.remove('input-error');
            }
        } else {
            errorSpan.textContent = '';
            confirm.classList.remove('input-error');
        }
    }
}

function validateEtaxPasswordMatch() {
    const original = document.getElementById('etaxPassword');
    const confirm = document.getElementById('etaxPasswordConfirm');
    const errorSpanId = 'etaxPasswordConfirm-error';

    if (!original || !confirm) return;

    let errorSpan = document.getElementById(errorSpanId);
    if (!errorSpan) {
        errorSpan = document.createElement('div');
        errorSpan.id = errorSpanId;
        errorSpan.className = 'inline-error-message';
        errorSpan.style.color = 'red';
        errorSpan.style.fontSize = '12px';
        errorSpan.style.marginTop = '4px';
        confirm.closest('.password-wrapper').after(errorSpan);
    }

    if (confirm.value && original.value) {
        // Trigger check when confirm length catches up to original
        if (confirm.value.length >= original.value.length) {
            if (confirm.value !== original.value) {
                errorSpan.textContent = 'パスワードが一致しません（リセットします）';
                confirm.classList.add('input-error');
                // Reset both values as requested
                confirm.value = '';
                original.value = '';
            } else {
                errorSpan.textContent = '';
                confirm.classList.remove('input-error');
            }
        } else {
            errorSpan.textContent = '';
        }
    }
}

function validateEmail(input) {
    if (!input.value) return null;
    // Simple email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.value)) {
        return {
            field: getFieldLabel(input),
            message: '正しいメールアドレスの形式で入力してください',
            example: 'example@email.com'
        };
    }
    return null;
}

function validateKatakana(input) {
    if (!input.value) return null;

    // Ignore spaces (full or half width)
    const normalized = input.value.replace(/[\s　]/g, '');

    // Check if remaining characters are Full-width Katakana
    // (Assuming we already normalized half-kana to full-kana on blur)
    if (!/^[\u30A0-\u30FF]+$/.test(normalized)) {
        return {
            field: getFieldLabel(input),
            message: '全角カタカナのみで入力してください',
            example: 'ヤマダ タロウ'
        };
    }
    return null;
}

// Move to next input on Enter
function moveToNextInput(currentInput) {
    const activeStep = document.querySelector('.form-step.active');
    const allInputs = Array.from(activeStep.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), select'));
    const visibleInputs = allInputs.filter(inp => !isHidden(inp));

    const currentIndex = visibleInputs.indexOf(currentInput);
    if (currentIndex >= 0 && currentIndex < visibleInputs.length - 1) {
        visibleInputs[currentIndex + 1].focus();
    } else {
        // Last input - blur to trigger validation then focus on next button
        currentInput.blur();
        const nextBtn = activeStep.querySelector('.btn-next');
        if (nextBtn) nextBtn.focus();
    }
}

// Validate single input and show popup if error
function validateSingleInput(input) {
    // Clear previous error on this input
    input.classList.remove('input-error');
    const existingError = input.parentNode.querySelector('.inline-error');
    if (existingError) existingError.remove();

    const error = getInputError(input);
    if (error) {
        input.classList.add('input-error');
        showErrorModal([error]);

        // Auto-clear sensitive fields if error occurs (My Number, Passwords)
        if (input.name.includes('myNumber') || input.name.includes('MyNumber') ||
            input.type === 'password' || input.name.toLowerCase().includes('password')) {
            input.value = '';
        }
        return false;
    }
    return true;
}

// Get error for a specific input
function getInputError(input) {
    // Phone: Strict validation with specific error messages
    if (input.id === 'phone' && input.value) {
        const val = input.value.trim();
        const phoneError = validatePhoneNumber(val);
        if (phoneError) {
            return phoneError;
        }
    }

    // Zip Code: 7 digits (Hyphens allowed for display, but main check is digits)
    if ((input.name.toLowerCase().includes('zip')) && input.value) {
        // Allow strictly "1234567" OR "123-4567"
        if (!/^\d{7}$/.test(input.value) && !/^\d{3}-\d{4}$/.test(input.value)) {
            return {
                field: '郵便番号',
                message: '郵便番号は7桁の半角数字（例: 123-4567 または 1234567）で入力してください',
                example: '123-4567'
            };
        }
    }

    if (input.name === 'accountHolder' || input.name === 'spouseKana' || input.name === 'fullNameKana') {
        const kataErr = validateKatakana(input);
        if (kataErr) return kataErr;
    }

    // Generic MyNumber Validation (Personal, Spouse, Dependent)
    // Exclude 'Confirm' fields from this length check, they are checked for match
    if (input.name.toLowerCase().includes('mynumber') && !input.name.toLowerCase().includes('confirm') && input.value) {
        if (!/^\d{12}$/.test(input.value)) {
            return {
                field: 'マイナンバー',
                message: '12桁の半角数字のみで入力してください（ハイフン不要）',
                example: '123456789012'
            };
        }
    }

    // Generic MyNumber Confirmation Match
    if (input.name.toLowerCase().includes('mynumberconfirm') && input.value) {
        // Heuristic: Remove 'Confirm' from ID or Name to find original
        // e.g. depMyNumberConfirm_1 -> depMyNumber_1
        let originalId = input.id.replace('Confirm', '');
        let original = document.getElementById(originalId);

        if (original && original.value !== input.value) {
            return {
                field: 'マイナンバー（確認）',
                message: '入力されたマイナンバーと一致しません',
                example: '正しい番号を再入力してください'
            };
        }
    }

    // Dependent Name Kana Validation
    if ((input.name.startsWith('depKana_') || input.name === 'spouseKana') && input.value) {
        // Re-use valiateKatakana which is already spaces-agnostic
        // But need to ensure it's called
        const kataErr = validateKatakana(input);
        if (kataErr) return kataErr;
    }

    if (input.name === 'spouseMyNumberConfirm') {
        const original = document.getElementById('spouseMyNumber');
        if (original && original.value !== input.value) {
            return {
                field: '配偶者のマイナンバー（確認）',
                message: '入力されたマイナンバーと一致しません',
                example: '正しい番号を再入力してください'
            };
        }
    }

    // Email Validation
    if (input.type === 'email' && input.value) {
        const emailErr = validateEmail(input);
        if (emailErr) return emailErr;
    }

    // e-Tax ID: 16 digits only
    if (input.name === 'etaxId' && input.value) {
        if (!/^\d{16}$/.test(input.value)) {
            return {
                field: '利用者識別番号',
                message: '16桁の半角数字で入力してください',
                example: '1234567890123456'
            };
        }
    }

    // e-Tax Password: 8-50 alphanumeric characters
    if (input.name === 'etaxPassword' && input.value) {
        if (input.value.length < 8 || input.value.length > 50) {
            return {
                field: 'e-Tax暗証番号',
                message: '8文字以上50文字以内で入力してください',
                example: '英数字を組み合わせた8文字以上'
            };
        }
        if (!/^[a-zA-Z0-9]+$/.test(input.value)) {
            return {
                field: 'e-Tax暗証番号',
                message: '半角英数字のみで入力してください',
                example: '英数字を組み合わせたパスワード'
            };
        }
    }

    // Account Number: 6 or 7 digits
    if (input.name === 'accountNumber' && input.value) {
        if (!/^\d{6,7}$/.test(input.value)) {
            return {
                field: '口座番号',
                message: '口座番号は6桁または7桁の半角数字で入力してください',
                example: '1234567'
            };
        }
    }

    return null;
}



// Comprehensive phone number validation with specific error messages
function validatePhoneNumber(val) {
    const field = '電話番号';

    // Remove all spaces and hyphens to check plain digits
    const digits = val.replace(/[\s-]/g, '');

    // Check if empty
    if (!digits) return null;

    // Check for non-numeric characters
    if (/[^\d]/.test(digits)) {
        return {
            field: field,
            message: '半角数字とハイフン（-）のみで入力してください',
            example: '携帯: 090-1234-5678 / 固定: 03-1234-5678'
        };
    }

    // Length check and Prefix check
    let isValid = false;

    if (digits.length === 10) {
        // Fixed landline: Must start with 0
        if (digits.startsWith('0')) {
            isValid = true;
        }
    } else if (digits.length === 11) {
        // Mobile/IP: Must start with specific prefixes
        const allowedPrefixes = ['090', '080', '070', '050'];
        if (allowedPrefixes.some(prefix => digits.startsWith(prefix))) {
            isValid = true;
        }
    }

    // Special check for Banking Step (section-h)
    if (activeStep.id === 'section-h') {
        const realBranchCode = document.getElementById('realBranchCode').value;
        const branchNameInput = document.getElementById('branchNameInput');

        // If branch name is entered but no real code (meaning not selected from list or invalid)
        if (branchNameInput.value && !realBranchCode) {
            isValid = false;
            branchNameInput.classList.add('input-error');
            errorDetails.push({
                field: '支店名・支店コード',
                message: '正しい支店を選択してください',
                example: '候補リストから選択するか、正しい店番を入力してください'
            });
        }
    }

    if (!isValid) {
        return {
            field: field,
            message: '電話番号の形式が正しくありません。\n10桁（0から開始）または11桁（090, 080, 070, 050から開始）で入力してください。',
            example: '携帯: 090-1234-5678 / 固定: 03-1234-5678'
        };
    }

    return null; // Valid
}

// Create Error Modal
function createErrorModal() {
    const modal = document.createElement('div');
    modal.id = 'errorModal';
    modal.className = 'error-modal hidden';
    modal.innerHTML = `
        <div class="error-modal-content">
            <h3>入力エラー</h3>
            <div id="errorModalBody"></div>
            <button type="button" onclick="closeErrorModal()">閉じる</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function showErrorModal(errors) {
    const modal = document.getElementById('errorModal');
    const body = document.getElementById('errorModalBody');

    let html = '<ul>';
    errors.forEach(err => {
        html += `<li><strong>${err.field}</strong>: ${err.message}<br><span class="example">例: ${err.example}</span></li>`;
    });
    html += '</ul>';

    body.innerHTML = html;
    modal.classList.remove('hidden');
}

function closeErrorModal() {
    document.getElementById('errorModal').classList.add('hidden');
}

// Helper for Dependent Address Toggle
function toggleDepAddress(radio, isSeparate) {
    const container = radio.closest('.card-section').querySelector('.dependent-address-block');
    const inputs = container.querySelectorAll('input, select');

    if (isSeparate) {
        container.classList.remove('hidden');
        inputs.forEach(inp => {
            if (inp.name && !inp.name.includes('Building')) {
                inp.required = true;
            }
        });
    } else {
        container.classList.add('hidden');
        inputs.forEach(inp => inp.required = false);
    }
}

// Data Normalization Utilities
// Navigation Logic
function showStep(index) {
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.remove('active');
    });

    const targetId = steps[index];
    const targetStep = document.getElementById(targetId);
    if (targetStep) {
        targetStep.classList.add('active');
        currentStepIndex = index;
        updateProgressBar();
        window.scrollTo(0, 0);

        // Re-setup listeners for dynamically added inputs
        setupInputListeners();
    }
}

// Data Normalization Utilities

// Convert Full-width Alphanumeric to Half-width (for numbers, emails, etc.)
function toHalfWidth(str) {
    if (!str) return '';
    return str.replace(/[！-～]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    }).replace(/　/g, " "); // Full space to half space
}

// Convert Half-width Kana to Full-width Kana
function toFullWidthKana(str) {
    if (!str) return '';
    const kanaMap = {
        'ｶﾞ': 'ガ', 'ｷﾞ': 'ギ', 'ｸﾞ': 'グ', 'ｹﾞ': 'ゲ', 'ｺﾞ': 'ゴ',
        'ｻﾞ': 'ザ', 'ｼﾞ': 'ジ', 'ｽﾞ': 'ズ', 'ｾﾞ': 'ゼ', 'ｿﾞ': 'ゾ',
        'ﾀﾞ': 'ダ', 'ﾁﾞ': 'ヂ', 'ﾂﾞ': 'ヅ', 'ﾃﾞ': 'デ', 'ﾄﾞ': 'ド',
        'ﾊﾞ': 'バ', 'ﾋﾞ': 'ビ', 'ﾌﾞ': 'ブ', 'ﾍﾞ': 'ベ', 'ﾎﾞ': 'ボ',
        'ﾊﾟ': 'パ', 'ﾋﾟ': 'ピ', 'ﾌﾟ': 'プ', 'ﾍﾟ': 'ペ', 'ﾎﾟ': 'ポ',
        'ｳﾞ': 'ヴ', 'ﾜﾞ': 'ヷ', 'ｦﾞ': 'ヺ',
        'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
        'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
        'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
        'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
        'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
        'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
        'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
        'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
        'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
        'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン',
        'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ',
        'ｯ': 'ッ', 'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ',
        '｡': '。', '｢': '「', '｣': '」', '､': '、', '･': '・', 'ｰ': 'ー'
    };
    let reg = new RegExp('(' + Object.keys(kanaMap).join('|') + ')', 'g');
    return str.replace(reg, function (match) {
        return kanaMap[match];
    }).replace(/ﾞ/g, '゛').replace(/ﾟ/g, '゜');
}

function nextStep() {
    if (!validateCurrentStep()) {
        return;
    }

    let nextIndex = currentStepIndex;

    const currentId = steps[currentStepIndex];
    if (currentId === 'section-a') {
        nextIndex = 1;
    } else if (currentId === 'section-c') {
        nextIndex = 4;
    } else if (currentId === 'section-f') {
        const incomeType = document.querySelector('input[name="incomeType"]:checked').value;
        if (incomeType === '1') {
            nextIndex = 6;
        } else {
            nextIndex = 5;
        }
    } else if (currentId === 'section-d') {
        nextIndex = 6;
    } else if (currentId === 'section-g') {
        nextIndex = 7;
    } else if (currentId === 'section-h') {
        nextIndex = 8; // Review
        renderReview();
    } else if (currentId === 'section-review') {
        if (!validateStrictUploads()) return;
        nextIndex = 9; // Accountant
    } else if (currentId === 'section-accountant') {
        nextIndex = 10; // Final Consent
    } else {
        nextIndex++;
    }

    stepHistory.push(nextIndex);
    showStep(nextIndex);
}

function prevStep() {
    if (stepHistory.length > 1) {
        stepHistory.pop();
        const prevIndex = stepHistory[stepHistory.length - 1];
        showStep(prevIndex);
    }
}

function handleSectionB() {
    if (!validateCurrentStep()) return;

    const incomeType = document.querySelector('input[name="incomeType"]:checked').value;
    let nextIndex;

    if (incomeType === '3') {
        nextIndex = 2;
    } else {
        nextIndex = 3;
    }

    stepHistory.push(nextIndex);
    showStep(nextIndex);
}

function updateProgressBar() {
    const totalSteps = steps.length - 2;
    let progress = 0;

    if (currentStepIndex === 9) progress = 100;
    else if (currentStepIndex === 2) progress = 10;
    else {
        progress = (currentStepIndex / (steps.length - 1)) * 100;
    }

    document.getElementById('progressBar').style.width = `${progress}%`;
}

// Full Page Validation (on Next button click)
function validateCurrentStep() {
    const activeStep = document.querySelector('.form-step.active');
    const inputs = activeStep.querySelectorAll('input, select');
    let isValid = true;
    let errorDetails = [];

    // Clear previous errors
    activeStep.querySelectorAll('.error-message').forEach(el => el.remove());
    activeStep.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    for (const input of inputs) {
        // Skip hidden inputs
        if (isHidden(input)) continue;

        // Skip radios (handled separately)
        if (input.type === 'radio') continue;

        // Skip file inputs (validated only at the end)
        if (input.type === 'file') continue;

        // Required check
        if (input.required && !input.value.trim()) {
            isValid = false;
            input.classList.add('input-error');
            errorDetails.push({
                field: getFieldLabel(input),
                message: 'この項目は必須です',
                example: '入力してください'
            });
            continue;
        }

        // Regex validation
        const error = getInputError(input);
        if (error) {
            isValid = false;
            input.classList.add('input-error');
            errorDetails.push(error);
        }
    }

    // Validate required radio groups
    const radioGroups = new Set();
    activeStep.querySelectorAll('input[type="radio"][required]').forEach(r => {
        if (!isHidden(r)) {
            radioGroups.add(r.name);
        }
    });

    radioGroups.forEach(name => {
        const checked = activeStep.querySelector(`input[name="${name}"]:checked`);
        if (!checked) {
            isValid = false;
            errorDetails.push({
                field: getRadioGroupLabel(activeStep, name),
                message: 'いずれかを選択してください',
                example: '選択肢から1つ選んでください'
            });
        }
    });

    // Special check for Family Step (section-f) - Dependents
    if (activeStep.id === 'section-f') {
        const hasDepsYes = document.querySelector('input[name="hasDependents"][value="yes"]:checked');
        if (hasDepsYes) {
            const countInput = document.getElementById('dependentCount');
            const count = parseInt(countInput.value) || 0;
            const list = document.getElementById('dependentsList');
            const actualForms = list.children.length;

            const spouseAsDependent = document.querySelector('input[name="spouseAsDependent"]:checked');
            const isSpouseDep = spouseAsDependent && spouseAsDependent.value === 'yes';

            if (count < 1 && !isSpouseDep) {
                isValid = false;
                countInput.classList.add('input-error');
                errorDetails.push({
                    field: '扶養親族の人数',
                    message: '扶養親族がいる場合、1人以上を入力してください',
                    example: '1以上の数字を入力'
                });
            } else if (actualForms < count) {
                isValid = false;
                errorDetails.push({
                    field: '扶養親族の詳細',
                    message: `人数（${count}人）分の情報を入力してください（現在${actualForms}人分）`,
                    example: '人数を入力すると入力フォームが表示されます'
                });
            } else {
                // Check that each dependent form has required fields filled
                for (let i = 0; i < actualForms; i++) {
                    const form = list.children[i];
                    const requiredInputs = form.querySelectorAll('input[required], select[required]');
                    requiredInputs.forEach(input => {
                        if (!isHidden(input) && !input.value.trim()) {
                            isValid = false;
                            input.classList.add('input-error');
                        }
                    });
                }
                if (!isValid && errorDetails.length === 0) {
                    errorDetails.push({
                        field: '扶養親族の詳細',
                        message: '扶養親族の必須項目をすべて入力してください',
                        example: '氏名、続柄、生年月日など'
                    });
                }
            }
        }
    }

    // Special check for Banking Step (section-h)
    if (activeStep.id === 'section-h') {
        const bankCode = document.getElementById('bankCode');
        const branchCode = document.getElementById('realBranchCode');

        if (!bankCode.value) {
            isValid = false;
            document.getElementById('bankNameSearch').classList.add('input-error');
            errorDetails.push({
                field: '銀行名',
                message: 'リストから銀行を選択してください',
                example: '名前の一部を入力して候補から選択'
            });
        }

        if (!branchCode.value) {
            isValid = false;
            // Only highlight if bank is selected, otherwise it's confusing
            if (bankCode.value) {
                document.getElementById('branchCodeInput').classList.add('input-error');
                document.getElementById('branchNameInput').classList.add('input-error');
                errorDetails.push({
                    field: '支店名・コード',
                    message: 'リストから支店を選択するか、正しいコード/支店名を入力してください',
                    example: '候補から選択'
                });
            }
        }
    }
    // File validation moved to submitForm for final submission check

    if (!isValid && errorDetails.length > 0) {
        showErrorModal(errorDetails);
    }

    return isValid;
}

// Helper: Check if element is inside a hidden parent
function isHidden(el) {
    let parent = el.parentElement;
    while (parent) {
        if (parent.classList.contains('hidden')) {
            return true;
        }
        parent = parent.parentElement;
    }
    return false;
}

// Helper: Get label for input
function getFieldLabel(input) {
    // For radio/checkbox, traverse up to find the form-group, not the parent label
    let searchElement = input;
    if (input.type === 'radio' || input.type === 'checkbox') {
        // Find the form-group containing the radio group
        searchElement = input.closest('.form-group');
        if (searchElement) {
            // First try question-label
            const questionLabel = searchElement.querySelector('.question-label');
            if (questionLabel) {
                return questionLabel.textContent.replace('必須', '').trim();
            }
            // Try the first label that's not wrapping a radio/checkbox
            const labels = searchElement.querySelectorAll('label');
            for (let lbl of labels) {
                if (!lbl.querySelector('input[type="radio"], input[type="checkbox"]')) {
                    return lbl.textContent.replace('必須', '').trim();
                }
            }
        }
        return input.name || '項目';
    }

    // For other inputs
    const formGroup = input.closest('.form-group');
    if (formGroup) {
        const questionLabel = formGroup.querySelector('.question-label');
        if (questionLabel) {
            return questionLabel.textContent.replace('必須', '').trim();
        }
        const label = formGroup.querySelector('label');
        if (label) {
            return label.textContent.replace('必須', '').trim();
        }
    }
    return input.name || input.id || '項目';
}

// Helper: Get label for radio group
function getRadioGroupLabel(container, name) {
    const radio = container.querySelector(`input[name="${name}"]`);
    if (radio) {
        const group = radio.closest('.form-group');
        const label = group?.querySelector('.question-label, label');
        if (label) {
            return label.textContent.replace('必須', '').trim();
        }
    }
    return name;
}

// Helper: Clear all inputs within a container
function clearHiddenInputs(container) {
    if (!container) return;
    container.querySelectorAll('input, select, textarea').forEach(input => {
        if (input.type === 'radio' || input.type === 'checkbox') {
            input.checked = false;
        } else if (input.type !== 'hidden' && input.type !== 'button') {
            input.value = '';
        }
    });
}

// Logic Toggles
function toggleJan1Address(value) {
    const block = document.getElementById('jan1AddressBlock');
    if (value === 'different') {
        block.classList.remove('hidden');
    } else {
        block.classList.add('hidden');
        clearHiddenInputs(block);
    }
}

function togglePastFiling(hasFiled) {
    const block = document.getElementById('etaxIdBlock');
    const etaxId = document.getElementById('etaxId');
    const etaxPass = document.getElementById('etaxPassword');

    if (hasFiled) {
        block.classList.remove('hidden');
        etaxId.required = true;
        etaxPass.required = true;
    } else {
        block.classList.add('hidden');
        clearHiddenInputs(block);
        etaxId.required = false;
        etaxPass.required = false;
    }
}

function toggleHeadRel(isNotHead) {
    const block = document.getElementById('headRelationBlock');
    const select = document.querySelector('select[name="headRelation"]');
    if (isNotHead) {
        block.classList.remove('hidden');
        select.setAttribute('required', 'required');
    } else {
        block.classList.add('hidden');
        select.removeAttribute('required');
        select.value = '';
    }
}

// Handle head relation change - auto-select commonlaw if spouse
function handleHeadRelationChange(relation) {
    const maritalSelect = document.querySelector('select[name="maritalStatus"]');

    if (relation === 'spouse') {
        // Enforce Married status
        maritalSelect.value = 'married';
        toggleMaritalStatus('married');

        // Disable other options functionality by resetting if changed (simulating lock)
        // Or strictly set it and disable the select if user wants strictly locked?
        // User request: "婚中しか選択できないような形にしてください" -> Make it so only 'married' can be selected.
        // We will add a listener or just force it here. 
        // Let's disable the select so they can't change it, but ensure value is submitted.
        // Actually disabling input means it won't submit. Better to restrict choice or auto-reset.
        // Let's add a visual lock and auto-reset listener for this specific case? 
        // Simple approach: When Relation=Spouse, hide other options or just force value on change.

        // Let's disable the select visually but keep the value 'married'
        // maritalSelect.disabled = true; // CAUTION: Disabled inputs are not submitted!
        // Instead, we can make it readonly-like or add a flag.
        // For now, let's just set it. If we really want to restrict, we can hide the other options.

        Array.from(maritalSelect.options).forEach(opt => {
            if (opt.value !== 'married' && opt.value !== '') {
                opt.disabled = true;
            }
        });
    } else {
        // Re-enable options
        Array.from(maritalSelect.options).forEach(opt => {
            opt.disabled = false;
        });

        // If it was auto-selected to commonlaw before, we might want to reset? 
        // Existing logic did: if (relation === 'spouse') ... maritalSelect.value = 'commonlaw'; -> Wait, previous logic was AUTO COMMONLAW?
        // User now wants AUTO MARRIED.
    }
}

function toggleMaritalStatus(status) {
    const spouseBlock = document.getElementById('spouseBlock');
    const commonlawInfo = document.getElementById('commonlawInfo');
    const singleParentWarning = document.getElementById('singleParentCommonlawWarning');
    const singleParentQuestions = document.getElementById('singleParentQuestions');
    const singleParentSection = document.getElementById('singleParentSection');

    // Reset all - hide first
    spouseBlock.classList.add('hidden');
    commonlawInfo.classList.add('hidden');
    singleParentWarning.classList.add('hidden');
    singleParentQuestions.classList.remove('hidden');

    if (status === 'married') {
        // Legal marriage - show spouse details
        spouseBlock.classList.remove('hidden');
        // Hide single parent/widow section entirely as it doesn't apply to married
        singleParentSection.classList.add('hidden');
        clearHiddenInputs(singleParentSection);
    } else {
        // Clear spouse data when not married
        clearHiddenInputs(spouseBlock);
        spouseBlock.classList.add('hidden');
        singleParentSection.classList.remove('hidden');

        if (status === 'commonlaw') {
            // Common-law - show warnings, hide questions (special case)
            commonlawInfo.classList.remove('hidden');
            singleParentWarning.classList.remove('hidden');
            singleParentQuestions.classList.add('hidden');
            clearHiddenInputs(singleParentQuestions);
        } else {
            // Divorced, Bereaved, Single
            commonlawInfo.classList.add('hidden');
            singleParentWarning.classList.add('hidden');
            singleParentQuestions.classList.remove('hidden');
        }
    }
}

// Keep old function name for compatibility
function toggleSpouseBlock(status) {
    toggleMaritalStatus(status);
}

function toggleDependents(hasDeps) {
    const container = document.getElementById('dependentsContainer');
    const countInput = document.getElementById('dependentCount');
    const list = document.getElementById('dependentsList');

    if (hasDeps) {
        container.classList.remove('hidden');
        updateSpouseAsDependentUI(); // Update notice based on spouse status
        // If count has a value but no forms, regenerate them
        const count = parseInt(countInput.value) || 0;
        if (count >= 1 && list.children.length === 0) {
            countInput.value = count;
            updateDependentForms(count);
        }
    } else {
        container.classList.add('hidden');
        // Clear dependent data when switching to "no"
        countInput.value = '';
        list.innerHTML = '';
    }
}

// Function to update the spouse-as-dependent notice and related UI
function updateSpouseAsDependentUI() {
    const notice = document.getElementById('spouseAsDependentNotice');
    const helper = document.getElementById('dependentCountHelper');
    const label = document.getElementById('dependentCountLabel');
    const countInput = document.getElementById('dependentCount');

    // Check if spouse is marked as a dependent
    const spouseAsDependent = document.querySelector('input[name="spouseAsDependent"]:checked');
    const isSpouseDependent = spouseAsDependent && spouseAsDependent.value === 'yes';

    if (isSpouseDependent) {
        // Spouse is a dependent - show notice and adjust labels
        notice.classList.remove('hidden');
        helper.classList.remove('hidden');
        label.innerHTML = '配偶者以外の扶養親族の人数 <span class="required">必須</span>';
        countInput.min = 0; // Allow 0 if only spouse is dependent
        countInput.placeholder = '配偶者以外の人数（0も可）';
    } else {
        // Spouse is not a dependent - hide notice
        notice.classList.add('hidden');
        helper.classList.add('hidden');
        label.innerHTML = '扶養親族の人数 <span class="required">必須</span>';
        countInput.min = 1;
        countInput.placeholder = '人数を入力';
    }
}

function updateDependentForms(count) {
    const list = document.getElementById('dependentsList');
    const currentCount = list.children.length;
    let targetCount = parseInt(count);

    if (isNaN(targetCount) || targetCount < 0) targetCount = 0;

    // Add forms if needed
    if (targetCount > currentCount) {
        for (let i = currentCount; i < targetCount; i++) {
            addDependent();
        }
    }
    // Remove excess forms
    else if (targetCount < currentCount) {
        // Remove from the end
        while (list.children.length > targetCount) {
            list.lastElementChild.remove();
        }
    }
}

function addDependent() {
    const list = document.getElementById('dependentsList');
    const count = list.children.length + 1;

    const div = document.createElement('div');
    div.className = 'card-section';
    div.style.backgroundColor = '#f0f4f8';
    div.innerHTML = `
        <h4>扶養親族 ${count}</h4>
        <div class="form-group">
            <label>氏名 <span class="required">必須</span></label>
            <input type="text" name="depName_${count}" required>
        </div>
        <div class="form-group">
            <label>氏名（カナ） <span class="required">必須</span></label>
            <input type="text" name="depKana_${count}" required>
        </div>
        <div class="form-group">
            <label>続柄 <span class="required">必須</span></label>
            <select name="depRel_${count}" required>
                <option value="">選択してください</option>
                <option value="child">子</option>
                <option value="parent">親</option>
                <option value="spouse_special">配偶者（特別）</option>
                <option value="other">その他</option>
            </select>
        </div>
        <div class="form-group">
            <label>生年月日 <span class="required">必須</span></label>
            <input type="date" name="depDob_${count}" max="9999-12-31" required>
        </div>
        <div class="form-group">
            <label>所得見込み</label>
             <input type="text" name="depIncome_${count}" placeholder="例：50万円">
        </div>

        <div class="form-group">
            <p class="question-label">障害の有無 <span class="required">必須</span></p>
            <div class="radio-group-horizontal">
                <label><input type="radio" name="depDisability_${count}" value="none" required> なし</label>
                <label><input type="radio" name="depDisability_${count}" value="general"> 一般障害</label>
                <label><input type="radio" name="depDisability_${count}" value="special"> 特別障害</label>
            </div>
        </div>
        
        <div class="form-group">
            <label>同居・別居の確認 <span class="required">必須</span></label>
            <div class="radio-group-horizontal">
                <label><input type="radio" name="depLiveCheck_${count}" value="together" required onchange="toggleDepAddress(this, false)"> 同居</label>
                <label><input type="radio" name="depLiveCheck_${count}" value="separate" onchange="toggleDepAddress(this, true)"> 別居</label>
            </div>
        </div>

        <div class="dependent-address-block hidden" style="margin-top: 15px; margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #6EB5C0;">
            <h4>別居親族の住所</h4>
            <div class="form-group">
                <label>郵便番号 <span class="required">必須</span></label>
                <input type="text" name="depZip_${count}" placeholder="123-4567" inputmode="numeric">
                <p class="helper-text">※ハイフンは不要です（自動で補完されます）</p>
            </div>
            <div class="form-group">
                <label>都道府県 <span class="required">必須</span></label>
                <select name="depPref_${count}">
                    <option value="">選択してください</option>
                    <option value="北海道">北海道</option>
                    <option value="青森県">青森県</option>
                    <option value="岩手県">岩手県</option>
                    <option value="宮城県">宮城県</option>
                    <option value="秋田県">秋田県</option>
                    <option value="山形県">山形県</option>
                    <option value="福島県">福島県</option>
                    <option value="茨城県">茨城県</option>
                    <option value="栃木県">栃木県</option>
                    <option value="群馬県">群馬県</option>
                    <option value="埼玉県">埼玉県</option>
                    <option value="千葉県">千葉県</option>
                    <option value="東京都">東京都</option>
                    <option value="神奈川県">神奈川県</option>
                    <option value="新潟県">新潟県</option>
                    <option value="富山県">富山県</option>
                    <option value="石川県">石川県</option>
                    <option value="福井県">福井県</option>
                    <option value="山梨県">山梨県</option>
                    <option value="長野県">長野県</option>
                    <option value="岐阜県">岐阜県</option>
                    <option value="静岡県">静岡県</option>
                    <option value="愛知県">愛知県</option>
                    <option value="三重県">三重県</option>
                    <option value="滋賀県">滋賀県</option>
                    <option value="京都府">京都府</option>
                    <option value="大阪府">大阪府</option>
                    <option value="兵庫県">兵庫県</option>
                    <option value="奈良県">奈良県</option>
                    <option value="和歌山県">和歌山県</option>
                    <option value="鳥取県">鳥取県</option>
                    <option value="島根県">島根県</option>
                    <option value="岡山県">岡山県</option>
                    <option value="広島県">広島県</option>
                    <option value="山口県">山口県</option>
                    <option value="徳島県">徳島県</option>
                    <option value="香川県">香川県</option>
                    <option value="愛媛県">愛媛県</option>
                    <option value="高知県">高知県</option>
                    <option value="福岡県">福岡県</option>
                    <option value="佐賀県">佐賀県</option>
                    <option value="長崎県">長崎県</option>
                    <option value="熊本県">熊本県</option>
                    <option value="大分県">大分県</option>
                    <option value="宮崎県">宮崎県</option>
                    <option value="鹿児島県">鹿児島県</option>
                    <option value="沖縄県">沖縄県</option>
                </select>
            </div>
            <div class="form-group">
                <label>市区町村・番地 <span class="required">必須</span></label>
                <input type="text" name="depCity_${count}" placeholder="市区町村・番地">
            </div>
            <div class="form-group">
                <label>建物名・部屋番号</label>
                <input type="text" name="depBuilding_${count}" placeholder="建物名・部屋番号">
            </div>
        </div>

        <div class="form-group">
            <label>マイナンバー <span class="required">必須</span></label>
            <div class="password-wrapper">
                 <input type="password" name="depMyNumber_${count}" id="depMyNumber_${count}" required placeholder="12桁の数字（ハイフンなし）">
            </div>
        </div>
        <div class="form-group">
            <label>マイナンバー（確認） <span class="required">必須</span></label>
             <div class="password-wrapper">
                <input type="password" name="depMyNumberConfirm_${count}" id="depMyNumberConfirm_${count}" required placeholder="確認のためもう一度入力してください">
            </div>
            <p class="helper-text">※12桁の数字のみ入力してください（ハイフン不要）</p>
        </div>




        <button type="button" class="btn-secondary" onclick="removeDependent(this)">削除</button>
    `;
    list.appendChild(div);

    // Setup listeners for new inputs
    setupInputListeners();
}

function removeDependent(btn) {
    const list = document.getElementById('dependentsList');
    const countInput = document.getElementById('dependentCount');

    // Prevent deletion if it would make count 0 while "has dependents" is yes
    const hasDepsYes = document.querySelector('input[name="hasDependents"][value="yes"]:checked');
    const spouseAsDependent = document.querySelector('input[name="spouseAsDependent"]:checked');
    const isSpouseDep = spouseAsDependent && spouseAsDependent.value === 'yes';

    if (hasDepsYes && list.children.length <= 1 && !isSpouseDep) {
        alert('扶養親族「いる」を選択している場合、1人以上の情報が必要です。');
        return;
    }

    btn.parentElement.remove();
    // Sync the count field with actual forms
    countInput.value = list.children.length;
}

function toggleDeductionDetail(type, isChecked) {
    const detailId = 'detail-' + type;
    const detailBlock = document.getElementById(detailId);
    if (detailBlock) {
        if (isChecked) {
            detailBlock.classList.remove('hidden');
            // Enable file inputs
            detailBlock.querySelectorAll('.upload-required').forEach(input => {
                input.required = true;
            });
        } else {
            detailBlock.classList.add('hidden');
            // Disable file inputs so validation passes
            detailBlock.querySelectorAll('.upload-required').forEach(input => {
                input.required = false;
                input.value = ''; // clear selection
            });
        }
    }
}

function submitForm() {
    if (!validateCurrentStep()) {
        return;
    }

    const agreement = document.getElementById('agreement');
    if (!agreement.checked) {
        showErrorModal([{
            field: '利用規約',
            message: '利用規約への同意が必要です',
            example: 'チェックボックスにチェックを入れてください'
        }]);
        return;
    }
    // File upload validation at final submission
    const activeDeductionDetails = document.querySelectorAll('.deduction-detail:not(.hidden)');
    let fileError = false;
    activeDeductionDetails.forEach(detail => {
        const fileInputs = detail.querySelectorAll('input[type="file"].upload-required');
        fileInputs.forEach(input => {
            if (input.required && input.files.length === 0) {
                fileError = true;
                input.classList.add('input-error');
            }
        });
    });

    if (fileError) {
        showErrorModal([{
            field: '控除証明書',
            message: '選択した控除項目に対応する証明書をアップロードしてください',
            example: '生命保険料控除証明書、地震保険料控除証明書など'
        }]);
        return;
    }

    showStep(9);
}
/* New Logic for Spouse Address and Password Toggle */
function toggleSpouseAddress(isSeparate) {
    const block = document.getElementById('spouseAddressBlock');
    const inputs = block.querySelectorAll('input, select');

    if (isSeparate) {
        block.classList.remove('hidden');
        inputs.forEach(input => {
            // Building name is optional
            if (input.name && !input.name.includes('Building')) {
                input.required = true;
            }
        });
    } else {
        block.classList.add('hidden');
        clearHiddenInputs(block);
        inputs.forEach(input => {
            input.required = false;
        });
    }
}

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

/* Banking Logic */

function handleBankNameInput() {
    const input = document.getElementById('bankNameSearch');
    const select = document.getElementById('bankCandidateSelect');
    const bankCode = document.getElementById('bankCode');
    const val = input.value;

    if (!window.REAL_BANKS) {
        select.style.display = 'none';
        return;
    }

    // Show all banks if input is empty on focus, otherwise filter
    const showAll = !val;

    // Filter banks (Prefix Match Only)
    let candidates;
    if (showAll) {
        // Don't show "All" if user wants "Only matching".
        // But "Unentered -> None" requested.
        // So showAll should return EMPTY candidates.
        candidates = [];
    } else {
        candidates = Object.values(window.REAL_BANKS).filter(bank => {
            const bName = bank.name || '';
            const bKana = bank.kana || '';
            const bHira = bank.hira || '';
            const bRoma = (bank.roma || '').toLowerCase();
            const v = val.toLowerCase();

            // Prefix match checks
            return bName.startsWith(val) ||
                bKana.startsWith(val) ||
                bHira.startsWith(val) ||
                bRoma.startsWith(v);
        });
    }

    if (candidates.length > 0) {
        select.innerHTML = '<option value="">候補を選択</option>';
        candidates.forEach(bank => {
            const opt = document.createElement('option');
            opt.value = bank.code;

            // Generate Formal Name
            let formalName = bank.name;
            const c = parseInt(bank.code, 10);
            if (!isNaN(c)) {
                if (c >= 1 && c <= 999) formalName += '銀行';
                else if (c >= 1000 && c <= 1999) formalName += '信用金庫';
                else if (c >= 2000 && c <= 2999) formalName += '信用組合';
                else if (c >= 3000 && c <= 3999) formalName += '労働金庫';
                else if (c >= 5000 && c <= 5999) formalName += '農業協同組合';
                else if (c === 9900) formalName += '銀行'; // Japan Post but API name is 'ゆうちょ' -> ゆうちょ銀行
            }

            opt.textContent = formalName;
            opt.dataset.name = formalName;
            select.appendChild(opt);
        });
        select.style.display = 'block';
        select.size = Math.min(candidates.length + 1, 5); // Show list style
    } else {
        select.style.display = 'none';
    }
}

async function selectBankCandidate() {
    const select = document.getElementById('bankCandidateSelect');
    const input = document.getElementById('bankNameSearch');
    const bankCodeInput = document.getElementById('bankCode');

    const code = select.value;
    if (!code) return;

    const name = select.selectedOptions[0].dataset.name;
    input.value = name;
    bankCodeInput.value = code;
    select.style.display = 'none';

    // Enable Branch Inputs
    document.getElementById('branchCodeInput').disabled = false;
    document.getElementById('branchNameInput').disabled = false;

    // Fetch Branches for this bank
    window.CURRENT_BRANCHES = {}; // Reset
    document.getElementById('branchCodeInput').value = '';
    document.getElementById('branchNameInput').value = '';
    document.getElementById('realBranchCode').value = '';
    document.getElementById('realBranchName').value = '';

    try {
        const res = await fetch(`https://zengin-code.github.io/api/branches/${code}.json`);
        if (res.ok) {
            window.CURRENT_BRANCHES = await res.json();
            console.log('Branches loaded for', name);
        }
    } catch (e) {
        console.error('Failed to fetch branches', e);
    }
}

function handleBranchCodeInput() {
    const codeInput = document.getElementById('branchCodeInput');
    const nameInput = document.getElementById('branchNameInput');
    const realCode = document.getElementById('realBranchCode');
    const realName = document.getElementById('realBranchName');

    const val = codeInput.value;
    if (!val) return;

    // Search in window.CURRENT_BRANCHES
    if (window.CURRENT_BRANCHES) {
        // Direct lookup if structure is Object key=code
        const branch = window.CURRENT_BRANCHES[val];
        if (branch) {
            nameInput.value = branch.name;
            realCode.value = branch.code;
            realName.value = branch.name;
            // Hide candidate select if open
            document.getElementById('branchCandidateSelect').style.display = 'none';
        }
    }
}

function handleBranchNameInput() {
    const nameInput = document.getElementById('branchNameInput');
    const codeInput = document.getElementById('branchCodeInput');
    const select = document.getElementById('branchCandidateSelect');
    const val = nameInput.value;

    if (!val || !window.CURRENT_BRANCHES) {
        select.style.display = 'none';
        return;
    }

    const candidates = Object.values(window.CURRENT_BRANCHES).filter(br =>
        br.name.includes(val) || br.kana.includes(val) || br.hira.includes(val)
    );

    if (candidates.length > 0) {
        select.innerHTML = '<option value="">候補を選択</option>';
        candidates.forEach(br => {
            const opt = document.createElement('option');
            opt.value = br.code;
            opt.textContent = br.name;
            opt.dataset.name = br.name;
            select.appendChild(opt);
        });
        select.style.display = 'block';
    } else {
        select.style.display = 'none';
    }
}

function selectBranchCandidate() {
    const select = document.getElementById('branchCandidateSelect');
    const codeInput = document.getElementById('branchCodeInput');
    const nameInput = document.getElementById('branchNameInput');
    const realCode = document.getElementById('realBranchCode');
    const realName = document.getElementById('realBranchName');

    const code = select.value;
    if (!code) return;

    const name = select.selectedOptions[0].dataset.name;

    codeInput.value = code;
    nameInput.value = name;
    realCode.value = code;
    realName.value = name;

    select.style.display = 'none';
}

/* Confirmation Flow */
function renderReview() {
    // Logic to gather all inputs and show in a summary table
    const container = document.getElementById('reviewContainer');
    if (!container) return;

    let html = '<table class="review-table">';

    // Iterate through all previous sections to gather data
    const sections = document.querySelectorAll('.form-step');

    // Logic State
    const incomeType = document.querySelector('input[name="incomeType"]:checked')?.value;

    sections.forEach(section => {
        // Skip current review section and future sections
        if (section.id === 'section-review' || section.id === 'section-accountant' || section.id === 'section-i' || section.id === 'section-j') return;

        // Skip logic based on section ID
        if (section.id === 'section-d') { // Salary Income
            // Section D shows "給与所得について".
            // Logic: incomeType 1 (Salary Only) -> Section G (Skipped D? No actually 1 -> F -> G? )
            // Wait, previous code flow check:
            // if (stepIndex === 4) { // Section D
            //     if (incomeType !== '2') showStep(6); // Skip D
            // }
            // So if incomeType is NOT 2, Section D is skipped.
            if (incomeType !== '2') return;
        }

        /* Logic for other sections as needed 
           Section C (Dependent) -> Checked by isHidden() on inputs usually
           Section F (Family) -> Always shown?
        */

        const header = section.querySelector('h2');
        if (header) {
            let sectionContent = '';

            // Header Override for Section G
            const headerText = (section.id === 'section-g') ? '適用する控除' : header.textContent;

            // Unique handling for Deductions (Section G) summary
            if (section.id === 'section-g') {
                const checkedDeductions = Array.from(section.querySelectorAll('input[name="deductions"]:checked'))
                    .map(cb => {
                        const span = cb.nextElementSibling;
                        return span ? span.textContent.trim() : cb.value;
                    });

                if (checkedDeductions.length > 0) {
                    sectionContent += `<tr><th>選択した控除</th><td>${checkedDeductions.join('、')}</td></tr>`;
                } else {
                    sectionContent += `<tr><th>選択した控除</th><td>なし</td></tr>`;
                }
            }

            // Find inputs
            const inputs = section.querySelectorAll('input, select, textarea');
            const processedRadios = new Set(); // Track processed radio groups

            inputs.forEach(input => {
                if (input.type === 'hidden' || input.type === 'button' || input.type === 'submit') return;

                // Skip Deduction checkboxes (Handled in summary above)
                if (input.name === 'deductions') return;

                // Specific exclusions for Banking
                if (input.id === 'bankCandidateSelect' || input.id === 'branchCandidateSelect') return;

                // Skip if hidden (e.g. inside unchecked deduction detail)
                if (isClassHidden(input)) return;

                // For Section G specific labeling logic
                let label = getFieldLabel(input);
                if (section.id === 'section-g') {
                    // Check if inside deduction-detail
                    const detail = input.closest('.deduction-detail');
                    if (detail) {
                        // Find Deduction Name from previous checkbox card
                        const card = detail.previousElementSibling;
                        const dedName = card ? card.querySelector('span')?.textContent.trim() : '';

                        // Find specific field label
                        let subLabel = '';
                        if (input.type === 'file') {
                            subLabel = '（証明書等）';
                        } else {
                            // Try to find local label
                            // Radio question?
                            const formGroup = input.closest('.form-group') || detail; // detail might act as group
                            const qLabel = formGroup.querySelector('.question-label');

                            // If input is radio, look for preceding label if question label missed
                            if (input.type === 'radio') {
                                const groupDiv = input.closest('.radio-group-horizontal') || input.closest('.radio-group');
                                if (groupDiv) {
                                    // Check for label before the group div
                                    const prevEl = groupDiv.previousElementSibling;
                                    if (prevEl && prevEl.tagName === 'LABEL') {
                                        subLabel = prevEl.textContent.trim();
                                    }
                                    // If qLabel found above, use it?
                                    if (!subLabel && qLabel) subLabel = qLabel.textContent.replace('必須', '').trim();
                                }
                            } else {
                                // Text input
                                const prevLabel = input.previousElementSibling;
                                if (prevLabel && prevLabel.tagName === 'LABEL') subLabel = prevLabel.textContent.trim();
                            }
                        }

                        if (dedName) {
                            if (subLabel) label = `${dedName}：${subLabel}`;
                            else label = dedName;
                        }
                    }
                }

                if (input.type === 'file') {
                    // Handle file inputs in review
                    const files = input.files;

                    if (files && files.length > 0) {
                        const fileNames = Array.from(files).map(f => f.name).join(', ');
                        sectionContent += `<tr><th>${label}</th><td>${fileNames}</td></tr>`;
                    } else if (input.classList.contains('upload-required')) {
                        // Required missing - RED
                        sectionContent += `<tr><th>${label}</th><td><span style="color:red; font-weight:bold;">添付なし（必須）</span></td></tr>`;
                    } else {
                        // Optional missing - Black
                        sectionContent += `<tr><th>${label}</th><td><span>添付なし</span></td></tr>`;
                    }
                    return;
                }

                // For radio buttons, only process checked ones and avoid duplicates
                if (input.type === 'radio') {
                    if (!input.checked) return;
                    if (processedRadios.has(input.name)) return;
                    processedRadios.add(input.name);
                }

                if (input.type === 'checkbox' && !input.checked) return;

                // Skip if parent is hidden (e.g. Spouse block when Single)
                // Use class-based visibility check
                if (isClassHidden(input)) return;

                // Label logic already handled above but need to define default label if not set (for non-Section G)
                // Wait, I defined 'let label = getFieldLabel(input)' at start of loop.
                // And updated it inside if(section.id === 'section-g').
                // So now I just use 'label'.
                // BUT wait, existing code below re-declares 'let label = getFieldLabel(input)' again!
                // I MUST remove the re-declaration below.

                let value = input.value;

                // Override labels for Banking Branch to match user request
                if (input.id === 'branchCodeInput') label = '支店コード';
                if (input.id === 'branchNameInput') label = '支店名';

                if (input.type === 'password') {
                    value = '********';
                } else if (input.tagName === 'SELECT') {
                    const opt = input.options[input.selectedIndex];
                    value = opt ? opt.text : '';
                } else if (input.type === 'radio' || input.type === 'checkbox') {
                    // Start of existing logic...
                    // I will replicate logic here but ensure I don't overwrite label inside Section G

                    // Get the Question Text if possible (ONLY if not Section G, or valid override)
                    if (section.id !== 'section-g') {
                        const formGroup = input.closest('.form-group');
                        let questionText = null;
                        if (formGroup) {
                            const qLabel = formGroup.querySelector('.question-label');
                            if (qLabel) questionText = qLabel.textContent.replace('必須', '').trim();
                            else {
                                const lbl = formGroup.querySelector('label');
                                if (lbl) questionText = lbl.textContent.replace('必須', '').trim();
                            }
                        }
                        if (questionText) label = questionText;
                    }

                    const parentLabel = input.closest('label');
                    if (parentLabel) {
                        // Get text content excluding the input itself
                        value = parentLabel.textContent.trim();
                    } else {
                        // Fallback: translate common values
                        const translations = {
                            'yes': 'はい',
                            'no': 'いいえ',
                            'male': '男性',
                            'female': '女性',
                            'married': '既婚',
                            'single': '未婚',
                            'divorced': '離婚',
                            'widowed': '死別',
                            'cohabiting': '同居',
                            'separate': '別居',
                            'ordinary': '普通',
                            'current': '当座',
                            'etax': 'e-Tax',
                            'paper': '書面',
                            'undecided': '未定',
                            '1': '給与のみ',
                            '2': '給与＋副業',
                            '3': 'その他事業'
                        };
                        value = translations[value] || value;
                    }
                }

                // Display even if empty for Required Fields (except Search inputs if we want strictness, but for Review, show empty state)
                if (input.hasAttribute('required') || input.classList.contains('required')) {
                    if (!value || value.trim() === '') {
                        value = '<span style="color:red;">（未入力）</span>';
                    }
                }

                if (value && value.trim() !== '') {
                    sectionContent += `<tr><th>${label}</th><td>${value}</td></tr>`;
                } else if (value && value.includes('span')) {
                    // For the "Unentered" case
                    sectionContent += `<tr><th>${label}</th><td>${value}</td></tr>`;
                }
            });

            if (sectionContent) {
                html += `<tr><td colspan="2" class="review-section-header">${header.textContent}</td></tr>` + sectionContent;
            }
        }
    });

    html += '</table>';
    container.innerHTML = html;
}

// ------------------------------------------------------------------
// DATA COLLECTION & FORM SCHEMA
// ------------------------------------------------------------------

// Define the Order and Labels for Google Sheets
// Keys must match 'name' attributes in HTML.
const FORM_FIELDS = [
    // --- Section A: Basic ---
    { name: 'fullName', label: '氏名', type: 'text' },
    { name: 'fullNameKana', label: '氏名（カナ）', type: 'text' },

    // --- Section B: Income Type ---
    { name: 'incomeType', label: '収入形態', type: 'radio', map: { '1': '本案件のみ', '2': '本案件＋給与', '3': '本案件＋その他事業' } },

    // --- Section C: Contact ---
    { name: 'email', label: 'メールアドレス', type: 'text' },
    { name: 'phone', label: '電話番号', type: 'text' },
    { name: 'zipCode', label: '現住所郵便番号', type: 'text' },
    { name: 'prefecture', label: '現住所都道府県', type: 'select' },
    { name: 'address1', label: '現住所市区町村・番地', type: 'text' },
    { name: 'address2', label: '現住所建物名', type: 'text' },

    { name: 'addressJan1', label: '1/1時点の住所', type: 'radio', map: { 'same': '現住所と同じ', 'different': '異なる' } },
    // Hidden details if different
    { name: 'jan1Zip', label: '1/1郵便番号', type: 'text' },
    { name: 'jan1Pref', label: '1/1都道府県', type: 'select' },
    { name: 'jan1City', label: '1/1市区町村・番地', type: 'text' },
    { name: 'jan1Building', label: '1/1建物名', type: 'text' },

    { name: 'dob', label: '生年月日', type: 'text' },
    { name: 'myNumber', label: 'マイナンバー', type: 'text' }, // Value masked in sheet? or raw? Access limited.
    { name: 'blueReturn', label: '青色申告承認', type: 'radio', map: { 'yes': 'あり', 'no': 'なし' } },
    { name: 'pastFiling', label: '過去の申告有無', type: 'radio', map: { 'yes': 'あり', 'no': 'なし' } },

    // Hidden e-Tax
    { name: 'etaxId', label: '利用者識別番号', type: 'text' },
    { name: 'etaxPassword', label: 'e-Taxパスワード', type: 'text' },

    // --- Section F: Family ---
    { name: 'isHead', label: '世帯主区分', type: 'radio', map: { 'yes': '世帯主本人', 'no': '世帯主ではない' } },
    { name: 'headRelation', label: '世帯主との続柄', type: 'select', map: { 'spouse': '配偶者', 'child': '子', 'parent': '親', 'other': 'その他' } },
    { name: 'maritalStatus', label: '婚姻状況', type: 'select', map: { 'married': '婚姻中', 'commonlaw': '事実婚', 'divorced': '離婚', 'bereaved': '死別', 'single': '未婚' } },

    // Spouse Details
    { name: 'spouseName', label: '配偶者氏名', type: 'text' },
    { name: 'spouseKana', label: '配偶者カナ', type: 'text' },
    { name: 'spouseDob', label: '配偶者生年月日', type: 'text' },
    { name: 'spouseMyNumber', label: '配偶者マイナンバー', type: 'text' },
    { name: 'spouseIncome', label: '配偶者所得見込', type: 'text' },
    { name: 'spouseDisability', label: '配偶者障害の有無', type: 'radio', map: { 'none': 'なし', 'general': '一般障害', 'special': '特別障害' } },
    { name: 'spouseAsDependent', label: '配偶者扶養適用の有無', type: 'radio', map: { 'yes': '適用する', 'no': '適用しない' } },
    { name: 'spouseLiveTogether', label: '配偶者同居区分', type: 'radio', map: { 'yes': '同居', 'no': '別居' } },
    // Spouse Address
    { name: 'spouseZip', label: '配偶者郵便番号', type: 'text' },
    { name: 'spousePref', label: '配偶者都道府県', type: 'select' },
    { name: 'spouseCity', label: '配偶者市区町村', type: 'text' },
    { name: 'spouseBuilding', label: '配偶者建物名', type: 'text' },

    // Dependents
    { name: 'hasDependents', label: '扶養親族の有無(配偶者除く)', type: 'radio', map: { 'yes': 'あり', 'no': 'なし' } },
    { name: 'dependentCount', label: '扶養親族人数', type: 'text' },
    { name: '_dependentsSummary', label: '扶養親族詳細情報', type: 'calculated' }, // Special handling

    // Single Parent (Widow/Widower)
    { name: 'hasChildTogether', label: '生計を一にする子の有無', type: 'radio', map: { 'yes': 'あり', 'no': 'なし' } },
    { name: 'supportChild', label: '子の扶養予定', type: 'radio', map: { 'yes': 'はい', 'no': 'いいえ', 'unknown': '不明' } },
    { name: 'incomeUnder5m', label: '所得500万円以下', type: 'radio', map: { 'yes': 'はい', 'no': 'いいえ', 'unknown': '不明' } },

    // --- Section D: Salary ---
    { name: 'companyCount', label: '勤務先の数', type: 'select', map: { '1': '1社', '2': '2社以上' } },
    { name: 'withholdingSlip', label: '源泉徴収票', type: 'file' },
    { name: 'yearEndAdj', label: '年末調整有無', type: 'radio', map: { 'yes': '済み', 'no': '未済', 'unknown': '不明' } },

    // --- Section G: Deductions ---
    {
        name: 'deductions', label: '適用する控除', type: 'checkbox', map: {
            'medical': '医療費控除',
            'furusato': 'ふるさと納税',
            'lifeIns': '生命保険料控除',
            'earthquake': '地震保険料控除',
            'ideco': 'iDeCo',
            'housing': '住宅ローン控除',
            'handicap': '障害者控除',
            'other': 'その他'
        }
    },

    // Deduction Details
    { name: 'medicalExpenses', label: '医療費・概算額', type: 'text' },
    { name: 'medicalNotice', label: '医療費通知の有無', type: 'radio', map: { 'yes': 'あり', 'no': 'なし' } },

    { name: 'furusatoCount', label: 'ふるさと納税寄附先数', type: 'text' },
    { name: 'onestop', label: 'ワンストップ特例利用', type: 'radio', map: { 'yes': '利用する', 'no': '利用しない' } },
    // Only File inputs for other deductions, we map files later

    { name: 'otherDeductionDetail', label: 'その他控除詳細', type: 'text' },

    // --- Section H: Bank ---
    { name: 'bankName', label: '銀行名', type: 'text' },
    { name: 'branchName', label: '支店名', type: 'text' },
    { name: 'accountType', label: '預金種別', type: 'select', map: { 'ordinary': '普通', 'current': '当座' } },
    { name: 'accountNumber', label: '口座番号', type: 'text' },
    { name: 'accountHolder', label: '口座名義(カナ)', type: 'text' },

    { name: 'taxMethod', label: '希望申告方法', type: 'radio', map: { 'etax': 'e-Tax', 'paper': '書面', 'undecided': '未定' } }
];

// Replaces original collectFormData
function collectFormData() {
    const data = {};
    const form = document.getElementById('taxForm');

    FORM_FIELDS.forEach(field => {
        // Handle Calculated Fields
        if (field.type === 'calculated') {
            if (field.name === '_dependentsSummary') {
                const depSection = document.getElementById('dependentsContainer');
                if (isClassHidden(depSection)) {
                    data[field.name] = '[SKIPPED]';
                } else {
                    // Aggregate dependent inputs
                    const depItems = document.querySelectorAll('.dependent-item');
                    if (depItems && depItems.length > 0) {
                        let summaries = [];
                        depItems.forEach((item, idx) => {
                            const name = item.querySelector(`[name="dependentName_${idx}"]`)?.value || '';
                            const rel = item.querySelector(`[name="dependentRelation_${idx}"]`)?.value || '';
                            const dob = item.querySelector(`[name="dependentDob_${idx}"]`)?.value || '';
                            if (name || rel || dob) {
                                summaries.push(`【${idx + 1}】${name}(${rel}, ${dob})`);
                            }
                        });
                        data[field.name] = summaries.length > 0 ? summaries.join('\n') : '';
                    } else {
                        data[field.name] = '';
                    }
                }
            }
            return;
        }

        // Standard Fields
        const elements = form.querySelectorAll(`[name="${field.name}"]`);
        if (elements.length === 0) {
            // Not found in DOM
            data[field.name] = '';
            return;
        }

        const firstEl = elements[0];
        // Check Visibility
        // We use the first element to determine visibility of the group
        if (isClassHidden(firstEl)) {
            data[field.name] = '[SKIPPED]';
            return;
        }

        let val = '';

        if (field.type === 'radio') {
            const checked = form.querySelector(`input[name="${field.name}"]:checked`);
            val = checked ? checked.value : '';
        } else if (field.type === 'checkbox') {
            const checked = form.querySelectorAll(`input[name="${field.name}"]:checked`);
            const values = Array.from(checked).map(c => c.value);
            // Translate values
            val = values.map(v => field.map ? (field.map[v] || v) : v).join('、');
            // If visible but none checked => Empty string
        } else if (field.type === 'file') {
            // Files: Check if files exist
            // Note: For accumulated files handling, we might need to check 'input.files' OR our accumulated structure.
            // Currently our accumulated logic handles 'input.files' update on change, but verify.
            // Simplified: Just check length.
            const hasFile = Array.from(elements).some(el => el.files && el.files.length > 0);
            val = hasFile ? 'アップロードあり' : 'なし';
        } else {
            // Text / Select
            val = firstEl.value || '';
        }

        // Apply Map Translation for Radio/Select if single value
        if ((field.type === 'radio' || field.type === 'select') && field.map && val) {
            val = field.map[val] || val;
        }

        data[field.name] = val;
    });

    return data;
}

let isSubmitting = false;

async function confirmSubmit() {
    if (isSubmitting) return;

    // File validation is now handled in the Review step (checkMissingUploadsConfirm)
    // We do not block here to allow "Proceed without upload" flow.

    // Final popup
    if (!confirm('本当に送信しますか？\n（修正が必要な場合は「キャンセル」を押して戻ってください）')) {
        return;
    }

    isSubmitting = true;

    // Show loading state
    const submitBtn = document.querySelector('.btn-primary') || document.getElementById('submitBtn');
    const originalText = submitBtn ? submitBtn.textContent : '送信';
    if (submitBtn) {
        submitBtn.textContent = 'ファイルをアップロード中...';
        submitBtn.disabled = true;
    }

    try {
        // --- 1. File Upload Phase ---
        const fileUploadResults = {};
        const fileInputs = document.querySelectorAll('input[type="file"]');

        // Collect all files to upload
        const uploads = [];
        fileInputs.forEach(input => {
            if (input.files.length > 0) {
                Array.from(input.files).forEach(file => {
                    uploads.push({ inputName: input.name, file: file });
                });
            }
        });

        // Process uploads sequentially (or Promise.all)
        // Using Promise.all for speed
        if (uploads.length > 0) {
            await Promise.all(uploads.map(async (item) => {
                // Get Signed URL
                const signRes = await fetch('/api/sign-upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: item.file.name,
                        fileType: item.file.type
                    })
                });

                if (!signRes.ok) throw new Error('アップロード用URLの取得に失敗しました');
                const { signedUrl, publicUrl } = await signRes.json();

                // Upload File to Supabase Storage (PUT)
                const uploadRes = await fetch(signedUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': item.file.type },
                    body: item.file
                });

                if (!uploadRes.ok) throw new Error(`${item.file.name}のアップロードに失敗しました`);

                // Store Result
                if (!fileUploadResults[item.inputName]) {
                    fileUploadResults[item.inputName] = [];
                }
                fileUploadResults[item.inputName].push(publicUrl);
            }));
        }

        // --- 2. Data Submission Phase ---
        if (submitBtn) submitBtn.textContent = '送信中...';

        // Collect form data
        const formData = collectFormData();

        // Merge file URLs into formData
        // Arrays are joined by comma or kept as array? 
        // collectFormData handles arrays for checkboxes.
        // Let's store files as comma-separated URLs or JSON string?
        // To be safe for Spreadsheet, simple string is best.
        // Or keep as array and let GAS handle it (JSON.stringify).

        Object.keys(fileUploadResults).forEach(key => {
            // Join URLs with newline or space for readability
            formData[key] = fileUploadResults[key].join('\n');
        });

        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || '送信に失敗しました');
        }

        // Clear saved progress on successful submit
        localStorage.removeItem('taxReturnFormData');

        showStep(11); // Success page
    } catch (error) {
        console.error('Submit error:', error);
        showErrorModal([{
            field: '送信エラー',
            message: error.message || 'サーバーへの送信に失敗しました。しばらくしてからもう一度お試しください。',
            example: ''
        }]);
    } finally {
        isSubmitting = false;
        // Restore button state
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
}

function isVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function isHidden(el) {
    return !isVisible(el);
}

/* File Upload Logic */
function setupFileUploads() {
    document.querySelectorAll('input[type="file"]').forEach(input => {
        // Create list container if not exists
        let list = input.nextElementSibling;
        if (!list || !list.classList.contains('file-list')) {
            list = document.createElement('div');
            list.className = 'file-list';
            input.parentNode.insertBefore(list, input.nextSibling);
        }

        input.addEventListener('change', handleFileSelect);
    });
}

function handleFileSelect(e) {
    const input = e.target;
    const list = input.nextElementSibling;
    const newFiles = Array.from(input.files);

    // Get existing files from data attribute or just assume input.files is source of truth?
    // But input.files is overwritten on change.
    // We need to maintain a state.
    // However, since we re-assign input.files using DataTransfer, lines 2155 in removeFile suggests we CAN modify input.files.
    // BUT on 'change' event, input.files ONLY contains the new selection.
    // We need to store previous files somewhere? 
    // Or we expect the user to select ALL files at once?
    // User requested "Multiple upload possible... delete button".
    // If I select A, then select B. 'change' fires with B. A is lost from input.files.
    // To support "Add file", we need a custom store OR we need to inspect the PREVIOUS state?
    // We can't inspecting previous state of input.files easily after change.

    // Strategy: We can't easily implement "Accumulate" on a single standard file input without a side-buffer.
    // OR we use the file-list visual as the "True State" and just update input.files to match it?
    // No, we need the file objects.

    // We can use a property on the element to store accumulated files.
    if (!input._accumulatedFiles) input._accumulatedFiles = [];

    // Merge new files
    newFiles.forEach(f => {
        // Avoid duplicates by name/size/lastModified
        const exists = input._accumulatedFiles.some(af =>
            af.name === f.name && af.size === f.size && af.lastModified === f.lastModified
        );
        if (!exists) input._accumulatedFiles.push(f);
    });

    // Update input.files
    const dt = new DataTransfer();
    input._accumulatedFiles.forEach(f => dt.items.add(f));
    input.files = dt.files;

    renderFileList(input, list, input._accumulatedFiles);
}

function renderFileList(input, list, files) {
    list.innerHTML = '';
    files.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '10px';
        item.style.marginTop = '5px';
        item.style.fontSize = '14px';

        const name = document.createElement('span');
        name.textContent = file.name;

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.textContent = '削除';
        delBtn.className = 'btn-delete-file';
        delBtn.style.padding = '2px 8px';
        delBtn.style.fontSize = '12px';
        delBtn.style.backgroundColor = '#ff4444';
        delBtn.style.color = 'white';
        delBtn.style.border = 'none';
        delBtn.style.borderRadius = '4px';
        delBtn.style.cursor = 'pointer';

        delBtn.onclick = () => removeFile(input, index);

        item.appendChild(name);
        item.appendChild(delBtn);
        list.appendChild(item);
    });
}

function removeFile(input, indexToRemove) {
    const dt = new DataTransfer();
    const files = Array.from(input.files);

    files.forEach((file, i) => {
        if (i !== indexToRemove) {
            dt.items.add(file);
        }
    });

    input.files = dt.files; // Update the input
    input._accumulatedFiles = Array.from(dt.files); // Sync accumulation

    // Re-render
    const list = input.nextElementSibling;
    renderFileList(input, list, Array.from(input.files));

    // Trigger validation if needed (e.g. required check)
    // Since we updated files properly, native validation should work, but custom might need help.
    if (input.required && input.files.length === 0) {
        // Maybe visually indicate? 
    }
}




// Check for missing uploads and confirm with user
function checkMissingUploadsConfirm() {
    // 1. Check Deduction Section (Section G)
    const activeDeductionDetails = document.querySelectorAll('.deduction-detail:not(.hidden)');
    let missingItems = [];

    activeDeductionDetails.forEach(detail => {
        const fileInputs = detail.querySelectorAll('input[type="file"]');
        // We check all file inputs in active details, primarily those marked upload-required or generally expected
        fileInputs.forEach(input => {
            if (input.files.length === 0) {
                // Get the label text for this deduction
                const checkboxCard = detail.previousElementSibling;
                const deductionName = checkboxCard?.querySelector('span')?.textContent || getFieldLabel(input);
                if (!missingItems.includes(deductionName)) {
                    missingItems.push(deductionName);
                }
            }
        });
    });

    // 2. Check Withholding Slip (Section D)
    const salaryBlock = document.getElementById('salaryIncomeBlock');
    if (salaryBlock && !isHidden(salaryBlock)) {
        const withholdingInput = document.getElementById('withholdingSlip');
        if (withholdingInput && withholdingInput.files.length === 0) {
            missingItems.push('源泉徴収票');
        }
    }

    if (missingItems.length > 0) {
        const message = '以下の項目について、添付ファイルがアップロードされていません。\nこのまま次へ進みますか？\n\n' +
            missingItems.map(item => '・' + item).join('\n') +
            '\n\n（書類なしで進む場合は「OK」、戻ってアップロードする場合は「キャンセル」）';

        if (!confirm(message)) {
            return false; // User cancelled, stay on page (or we could redirect)
        }
    }
    return true; // Proceed
}

/* Missing Helper Functions */
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

function isClassHidden(el) {
    // Check if element or any ancestor up to form-step has 'hidden' class
    let current = el;
    while (current && !current.classList.contains('form-step')) {
        if (current.classList.contains('hidden')) return true;
        current = current.parentElement;
    }
    return false;
}

function validateStrictUploads() {
    let missingRequired = [];
    let missingOptional = [];

    // Check Deduction Section (Section G)
    const activeDeductionDetails = document.querySelectorAll('.deduction-detail:not(.hidden)');
    activeDeductionDetails.forEach(detail => {
        const fileInputs = detail.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => {
            if (input.files.length === 0) {
                const checkboxCard = detail.previousElementSibling;
                const deductionName = checkboxCard?.querySelector('span')?.textContent || getFieldLabel(input);

                if (input.classList.contains('upload-required')) {
                    if (!missingRequired.includes(deductionName)) missingRequired.push(deductionName);
                } else {
                    if (!missingOptional.includes(deductionName)) missingOptional.push(deductionName);
                }
            }
        });
    });

    // Check Withholding Slip (Section D)
    const salaryBlock = document.getElementById('salaryIncomeBlock');
    if (salaryBlock && !isClassHidden(salaryBlock)) { // Use isClassHidden to be safe
        const withholdingInput = document.getElementById('withholdingSlip');
        if (withholdingInput && withholdingInput.files.length === 0) {
            missingRequired.push('源泉徴収票');
        }
    }

    if (missingRequired.length > 0) {
        showErrorModal([{
            field: '必須ファイルの未添付',
            message: '以下の項目はファイルのアップロードが必須です。\n戻ってアップロードしてください。',
            example: missingRequired.join('、\n')
        }]);
        return false;
    }

    if (missingOptional.length > 0) {
        // Confirmation for optional files
        const message = '以下の項目について、添付ファイルがアップロードされていません。\nこのまま次へ進みますか？\n\n' +
            missingOptional.map(item => '・' + item).join('\n') +
            '\n\n（書類なしで進む場合は「OK」、戻ってアップロードする場合は「キャンセル」）';

        if (!confirm(message)) return false;
    }

    return true;
}
