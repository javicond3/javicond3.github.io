function changeTeaching(nav_child) {
    const navs = ['subjects', 'theses'];
    navs.forEach(nav => {
        let div_child = document.getElementById('nav_'+nav)
        let title = document.getElementById('title_'+nav)
        if (nav === nav_child){
            div_child.style.display = 'block';
            title.style.display = 'inline';

        } else {
            div_child.style.display = 'none';
            title.style.display = 'none';
            document.getElementById('button_'+nav).classList.remove("button_pressed");
        }
    })
}