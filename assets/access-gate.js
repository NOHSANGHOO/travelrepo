(function () {
    const KEY = "travel_view_ok";
    const PASSWORD = "0262";
    const gate = document.getElementById("access-gate");
    if (!gate) return;

    if (localStorage.getItem(KEY) === "1") {
        gate.remove();
        return;
    }

    document.body.style.overflow = "hidden";

    function trySubmit() {
        const input = document.getElementById("access-gate-input");
        const errorEl = document.getElementById("access-gate-error");
        if (input.value === PASSWORD) {
            localStorage.setItem(KEY, "1");
            document.body.style.overflow = "";
            gate.remove();
        } else {
            errorEl.textContent = "비밀번호가 올바르지 않습니다.";
            input.value = "";
            input.focus();
        }
    }

    document.getElementById("access-gate-submit").addEventListener("click", trySubmit);
    document.getElementById("access-gate-input").addEventListener("keydown", function (e) {
        if (e.key === "Enter") trySubmit();
    });
    document.getElementById("access-gate-input").focus();
})();
