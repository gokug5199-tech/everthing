// Universal back buttons: return to the page the user came from
document.addEventListener('DOMContentLoaded', function () {
    const selectors = [
        '.back-navigation',
        '.back-button',
        '.te-info-back',
        '.back-home',
        '.back-login'
    ];

    document.querySelectorAll(selectors.join(',')).forEach(function(btn){
        btn.addEventListener('click', function(e){
            e.preventDefault();

            if (window.history.length > 1 && document.referrer) {
                history.back();
            } else {
                window.location.href = 'index.html';
            }
        });
    });
});
