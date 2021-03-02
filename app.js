function createRobot() {
    const robot = document.createElement("div");
    robot.classList.add("robot");

    robot.style.left = Math.random() * 100 + "vw";
    robot.style.animationDuration = Math.random() * 2 + 3 + "s";

    robot.innerText = "🤖";

    document.body.appendChild(robot);

    setTimeout(() => {
        robot.remove();
    }, 5000);
}

setInterval(createRobot, 300);