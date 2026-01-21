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
    'section-i', // 8: Verification
    'section-j'  // 9: Completion
];

// Logic History Stack
let stepHistory = [0];

document.addEventListener('DOMContentLoaded', () => {
    updateProgressBar();

    // Listeners for conditional logic
    document.querySelectorAll('input[name="addressJan1"]').forEach(radio => {
        radio.addEventListener('change', (e) => toggleJan1Address(e.target.value));
    });
});

// Navigation Functions
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
    }
}

function nextStep() {
    if (!validateCurrentStep()) {
        return; // Validation alerts handled inside
    }

    let nextIndex = currentStepIndex;

    const currentId = steps[currentStepIndex];
    if (currentId === 'section-a') {
        nextIndex = 1; // -> Section B
    } else if (currentId === 'section-c') {
        // Always to Family (F)
        nextIndex = 4;
    } else if (currentId === 'section-f') {
        // F -> D (if Type 2) or G (if Type 1)
        const incomeType = document.querySelector('input[name="incomeType"]:checked').value;
        if (incomeType === '1') {
            nextIndex = 6; // Skip Salary (D=5), go to G
        } else {
            nextIndex = 5; // Go to Salary (D=5)
        }
    } else if (currentId === 'section-d') {
        nextIndex = 6; // -> Section G
    } else if (currentId === 'section-g') {
        nextIndex = 7; // -> Section H
    } else if (currentId === 'section-h') {
        nextIndex = 8; // -> Section I
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
        nextIndex = 2; // section-termination
    } else {
        nextIndex = 3; // section-c
    }

    stepHistory.push(nextIndex);
    showStep(nextIndex);
}

function updateProgressBar() {
    // Excluding termination and completion from count typically
    // A=0, B=1, C=3, F=4, D=5, G=6, H=7, I=8
    // Total steps logic can be simplified or just use index relative to length
    const totalSteps = steps.length - 2; // rough
    let progress = 0;

    if (currentStepIndex === 9) progress = 100;
    else if (currentStepIndex === 2) progress = 10;
    else {
        // Simple linear map for now
        progress = (currentStepIndex / (steps.length - 1)) * 100;
    }

    document.getElementById('progressBar').style.width = `${progress}%`;
}

// Validation Logic
function validateCurrentStep() {
    const activeStep = document.querySelector('.form-step.active');
    const inputs = activeStep.querySelectorAll('input, select');
    let isValid = true;
    let errorMessages = [];

    // Clear previous errors
    activeStep.querySelectorAll('.error-message').forEach(el => el.remove());
    activeStep.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

    for (const input of inputs) {
        if (!input.checkValidity()) {
            // Basic HTML5 validation
            isValid = false;
            input.classList.add('input-error');
            continue; // Don't check regex if basic fail
        }

        // Custom Validations logic
        if (input.required && !input.value.trim()) {
            // Handled by checkValidity mostly, but for radios:
            if (input.type === 'radio') {
                const name = input.name;
                const checked = activeStep.querySelector(`input[name="${name}"]:checked`);
                if (!checked) {
                    isValid = false;
                    // Add error message style
                    errorMessages.push(`${name} is required`); // User facing can be generic
                }
            }
        }

        let error = '';

        // Phone: Strictly 10 or 11 digits with 2 hyphens
        if (input.id === 'phone') {
            const val = input.value;
            // Pattern: start with 0, 1-4 digits, hyphen, 1-4 digits, hyphen, 3-4 digits.
            // AND total digit count check.
            const formatRegex = /^0\d{1,4}-\d{1,4}-\d{3,4}$/;
            const digits = val.replace(/-/g, '');

            if (!formatRegex.test(val) || (digits.length !== 10 && digits.length !== 11)) {
                error = '半角ハイフン2つを含む10桁または11桁の番号で入力してください。';
            }
        }

        // Zip Code: Strictly WITH hyphen
        if (input.name === 'zipCode' || input.name === 'jan1Zip') {
            const val = input.value;
            const formatRegex = /^\d{3}-\d{4}$/;
            if (!formatRegex.test(val)) {
                error = '半角ハイフンを含む7桁の番号で入力してください（例：123-4567）。';
            }
        }

        // My Number: Strictly NO hyphen, 12 digits
        if (input.name === 'myNumber') {
            if (!/^\d{12}$/.test(input.value)) {
                error = '12桁の半角数字のみで入力してください（ハイフン不要）。';
            }
        }

        if (error) {
            isValid = false;
            input.classList.add('input-error');
            const msg = document.createElement('p');
            msg.className = 'error-message';
            msg.style.color = 'red';
            msg.style.fontSize = '0.9em';
            msg.innerText = error;
            input.parentNode.appendChild(msg);
        }
    }

    if (!isValid) {
        alert('入力内容に不備があります。赤枠の項目を確認してください。');
    }

    return isValid;
}

// Logic Toggles
function toggleJan1Address(value) {
    const block = document.getElementById('jan1AddressBlock');
    if (value === 'different') {
        block.classList.remove('hidden');
        setRequired(block, true);
    } else {
        block.classList.add('hidden');
        setRequired(block, false);
    }
}

function toggleHeadRel(isNotHead) {
    const block = document.getElementById('headRelationBlock');
    if (isNotHead) {
        block.classList.remove('hidden');
    } else {
        block.classList.add('hidden');
    }
}

function toggleSpouseBlock(status) {
    const block = document.getElementById('spouseBlock');
    if (status === 'married') {
        block.classList.remove('hidden');
        setRequired(block, true);
    } else {
        block.classList.add('hidden');
        setRequired(block, false);
    }
}

function toggleDependents(hasDeps) {
    const container = document.getElementById('dependentsContainer');
    if (hasDeps) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
        document.getElementById('dependentsList').innerHTML = ''; // Clear
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
            <label>氏名</label>
            <input type="text" name="depName_${count}" required>
        </div>
        <div class="form-group">
            <label>続柄</label>
            <select name="depRel_${count}" required>
                <option value="">選択してください</option>
                <option value="child">子</option>
                <option value="parent">親</option>
                <option value="spouse_special">配偶者（特別）</option>
                <option value="other">その他</option>
            </select>
        </div>
        <div class="form-group">
            <label>生年月日</label>
            <input type="date" name="depDob_${count}" max="9999-12-31" required>
        </div>
        <div class="form-group">
            <label>所得見込み</label>
             <input type="text" name="depIncome_${count}" placeholder="例：50万円">
        </div>
        <div class="form-group">
            <label>別居の場合の住所</label>
            <input type="text" name="depAddress_${count}">
        </div>
        <button type="button" class="btn-secondary" onclick="this.parentElement.remove()">削除</button>
    `;
    list.appendChild(div);
}

function toggleDeductionDetail(type, isChecked) {
    const detailId = 'detail-' + type;
    const detailBlock = document.getElementById(detailId);
    if (detailBlock) {
        if (isChecked) {
            detailBlock.classList.remove('hidden');
        } else {
            detailBlock.classList.add('hidden');
        }
    }
}

function submitForm() {
    const agreement = document.getElementById('agreement');
    if (!agreement.checked) {
        alert('利用規約への同意が必要です。');
        return;
    }

    // Move to completion
    showStep(9); // Section J
}

function setRequired(container, isRequired) {
    container.querySelectorAll('input, select').forEach(el => {
        // Logic to toggle required attr if needed, 
        // strictly speaking for hidden inputs browser won't validate them if style=display:none, 
        // but explicit toggle helps.
        if (isRequired) el.setAttribute('required', 'true');
        else el.removeAttribute('required');
    });
}
