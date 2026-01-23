
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
