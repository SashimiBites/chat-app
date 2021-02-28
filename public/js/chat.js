const socket = io();

//Elements
const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");
const $sidebar = document.querySelector("#sidebar");

//Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationTemplate = document.querySelector("#location-template").innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

//Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

// server (emit) => client (receive) --acknowledgement => server
// client (emit) => server (receive) --acknowledgement => client

const autoscroll = () => {
    //New messgae element
    const $newMessage = $messages.lastElementChild;

    //Height of the new message
    const newMessageStyles = getComputedStyle($newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

    //Visible Height
    const visibleHeight = $messages.offsetHeight;

    //Height of messages container
    const containerHeight = $messages.scrollHeight;

    //How far have i scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight;

    if(containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = containerHeight;
    }
};

socket.on("message", (message) => {
    console.log(message.text);
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format("h:mm a")
    });
    $messages.insertAdjacentHTML("beforeend", html);
    autoscroll();
});

socket.on("sendMessageAll", (message) => {
    console.log(message);
});

socket.on("locationMessage", (message) => {
    console.log(message);
    const html = Mustache.render(locationTemplate, {
        username: message.username,
        url: message.url,
        createdAt: moment(message.createdAt).format("h:mm a")
    });
    $messages.insertAdjacentHTML("beforeend", html);
    autoscroll();
});

socket.on("roomData", ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    });
    $sidebar.innerHTML = html;
});

$messageForm.addEventListener("submit", (e) => {
    e.preventDefault();

    $messageFormButton.setAttribute("disabled", "disabled");

    let message = new FormData(e.target).get("message");
    socket.emit("sendMessage", message, (error) => {
        $messageFormButton.removeAttribute("disabled");
        $messageFormInput.value = "";
        $messageFormInput.focus();

        if(error) {
            return console.log(error);
        } 
        console.log("Message delivered!");
    }); 
});

$sendLocationButton.addEventListener("click", (e) => {
    if(!navigator.geolocation) {
        return alert("Geolocation is not supported by your browser.");
    } 
    $sendLocationButton.setAttribute("disabled", "disabled");
    navigator.geolocation.getCurrentPosition((position) => {
        let location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }
        socket.emit("sendLocation", location, () => {
            $sendLocationButton.removeAttribute("disabled");
            console.log("Location shared!");
        });
    });
});

socket.emit("join", { username, room }, (error) => {
    if(error) {
        alert(error);
        location.href = "/";
    }
});