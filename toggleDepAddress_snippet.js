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
