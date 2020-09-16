import './index.css';
import {sleep} from "./utils";

const SCHEDULE_URL = "https://schedule-api.ponyfest.horse/schedule"
const ROOMS = [
    "Mane Events",
    "Deep Dish Stage",
    "Hoof Work Stage",
];

interface InputEvent {
    id: string;
    startTime: string;
    endTime: string;
    title: string;
    panelists: string;
    description: string;
}

interface Event {
    id: string;
    startTime: Date;
    endTime: Date;
    title: string;
    panelists: string;
    description: string;
}

let schedule: {[room: string]: Event[]} = {};

const currentRoom = new URLSearchParams(location.search).get("room") || "";

let iteration = 0;
async function renderLoop() {
    const myIteration = ++iteration;
    const h1 = document.getElementById('heading')! as unknown as SVGTextElement;
    const p = document.getElementById('panel')!;
    let roomPointer = 0;
    let currentHeading = "";
    let currentText = "";
    let deadRooms = 0;
    let first = true;
    while (true) {
        if (iteration != myIteration) {
            return;
        }
        const room = ROOMS[roomPointer];
        const event = getCurrentEvent(room);
        roomPointer = (roomPointer + 1) % ROOMS.length;
        if (!event) {
            if (++deadRooms === ROOMS.length) {
                deadRooms = 0;
                h1.innerHTML = "&nbsp;";
                p.innerText = "Thanks for joining us!";
                currentHeading = "";
                currentText = "Thanks for joining us!";
                await sleep(300000);
            }
            continue;
        }
        deadRooms = 0;
        const heading = (room === currentRoom ? "Here" : room.replace("'", "’")) + ":";
        const text = event.title;
        if (heading === currentHeading && text === currentText) {
            await sleep(10000);
            continue;
        }
        if (!first) {
            document.body.className = 'transitioning';
            await sleep(550);
        }
        if (iteration != myIteration) {
            return;
        }
        first = false;
        h1.textContent = heading;
        p.innerText = text;
        currentHeading = heading;
        currentText = text;
        document.body.className = '';
        await sleep(550);
        await sleep(7000);
    }
}

function getCurrentEvent(room: string): Event | undefined {
    const now = Date.now(); //(new Date("2020-07-04T18:00:00-05:00")).getTime();
    let currentEvent: Event | undefined = undefined;
    for (const event of reversed(schedule[room])) {
        console.log(event.startTime, event.endTime);
        if (now < event.endTime.getTime() - Math.max((event.endTime.getTime() - event.startTime.getTime()) / 4, 900000) && now > event.startTime.getTime() - 2700000) {
            currentEvent = event;
        }
    }
    return currentEvent;
}

function* reversed<T>(array: T[]): Generator<T> {
    for (let i = array.length - 1; i >= 0; i--) {
        yield array[i];
    }
}

async function updateSchedule(): Promise<{[room: string]: Event[]}> {
    const request = await fetch(SCHEDULE_URL);
    const json: {[room: string]: InputEvent[]} = (await request.json()).rooms;
    const schedule: {[room: string]: Event[]} = {};
    for (const room in json) {
        schedule[room] = [];
        for (const event of json[room]) {
            schedule[room].push({...event, startTime: new Date(event.startTime), endTime: new Date(event.endTime)});
        }
    }
    return schedule;
}

(async function() {
    schedule = await updateSchedule();
    setInterval(async () => {
        schedule = await updateSchedule();
    }, 300000);

    renderLoop();
})();



declare global {
    interface Window {
        obsstudio?: {
            onActiveChange: (active: boolean) => void
        }
    }
}

if (window.obsstudio) {
    window.obsstudio.onActiveChange = (active) => {
        if (active) {
            renderLoop();
        }
    };
}
