let iframeDoc = null;

const DAY = 86400000;
const HOUR = 3600000;
const MIN = 60000;
const SEC = 1000;

let assistantQueues = {
	"Student Rentals": runRental,
	"Open Service Desk -Checked in Machines": runOpenServiceDesk,
	"Service Desk Tickets": runServiceDesk
};

let lastNotificationSent = new Date() + (10 * MIN);

try {
	iframe = document.getElementById("appDesktop");
	iframeWin = iframe.contentWindow || iframe;
	iframeDoc = iframe.contentDocument || iframeWin.document;
} catch {
	iframeDoc = document;
}

// ASSISTANT
sleep(5 * SEC).then(() => {
	buildRefreshers();
	iframeDoc.getElementById("btnRefresh").href = "javascript: window.location.reload()";
	
	chrome.storage.sync.get("enabled", function (data) {
		if (data.enabled) {
			runAssistant();
		}
	});
	
});

// AUTO-REFRESHING
let SCAssistantAutoRefresh = true;

chrome.storage.sync.get("refresh", function (data) {
	SCAssistantAutoRefresh = data.refresh
});

sleep(10 * MIN).then(() => {
	setInterval(refresh, 10 * MIN);
	
	function refresh() {
		let onDesktop = iframeDoc.getElementById("lblDesktops");
		if (onDesktop) onDesktop = onDesktop.offsetParent;
		
		if (SCAssistantAutoRefresh && onDesktop) {
			window.location.reload();
		}
	}
});

// FUNCTIONS
function buildRefreshers() {
	let queueRefreshers = iframeDoc.getElementsByClassName("refreshAnchor");
	let queueSorters = iframeDoc.getElementsByClassName("sort-link");
	let refreshList = [queueRefreshers, queueSorters];
	
	for (let i = 0; i < refreshList.length; i++) {
		for (let j = 0; j < refreshList[i].length; j++) {
			refreshList[i][j].onclick = function () {
				refresher(3 * SEC);
			};
		}
	}
}

function refresher(time) {
	chrome.storage.sync.get("enabled", async function (data) {
		await sleep(time);
		
		if (data.enabled) {
			runAssistant();
		}
		
		buildRefreshers()
	});
}

function runAssistant() {
	let queues = iframeDoc.getElementsByClassName("desktop-module");
	
	// Using a foreach causes issues when destructuring the objects
	for (let i = 0; i < queues.length; i++) {
		let title = queues[i].getElementsByTagName("h4")[0].innerText;
		let table = queues[i].children[1].children[0].children[0];
		
		if (table === undefined) continue;
		
		if (table) if (Object.keys(assistantQueues).includes(title)) assistantQueues[title](table.children[1]);
	}
}

function runRental(table) {
	for (let i = 0; i < table.children.length; i++) {
		let row = table.children[i];
		let status = row.children[3].innerText;
		let timestampString = row.children[4].innerText;
		let timeArray = timestampString.substring(4,);
		let date = timeArray.split("/");
		
		let timeNow = new Date(Date.now());
		// Definitely overkill to catch down to the Millisecond, but hey, why not
		let ticketTime = new Date(parseInt(date[2]) + 2000, parseInt(date[0]) - 1, parseInt(date[1]) - 1, 23, 59, 59);
		let timeDif = ticketTime - timeNow;
		
		if (status === "New") {
			row.classList.add("SCAssistant_New");
		} else if (timeDif < DAY){
			row.classList.add("SCAssistant_Danger");
		} else if (timeDif > DAY) {
			row.classList.add("SCAssistant_Warning");
		}
	}
}

function runOpenServiceDesk(table) {
	for (let i = 0; i < table.children.length; i++) {
		let row = table.children[i];
		let status = row.children[3].innerText;
		let timestampString = row.children[4].innerText;
		let timeArray = timestampString.substring(4,).split(" ");
		let date = timeArray[0].split("/");
		let time = timeArray[1].split(":");
		
		if (timeArray[2] === "PM") time[0] = (parseInt(time[0]) + 12).toString();
		
		let ticketTime = new Date(parseInt(date[2]) + 2000, parseInt(date[0]) - 1, parseInt(date[1]), parseInt(time[0]), parseInt(time[1]), 0, 0);
		let timeNow = new Date(Date.now());
		let timeDif = timeNow - ticketTime;
		
		if (status === "New") {
			row.classList.add("SCAssistant_New");
			showNewTicketNotification()
		} else if (timeDif > DAY * 4) { //If the ticket hasn't been modified in over 4 days - Danger
			row.classList.add("SCAssistant_Danger");
		} else if (timeDif > DAY * 3) { //If the ticket hasn't been modified within 3 days - WarningOrange
			row.classList.add("SCAssistant_WarningOrange");
		} else if (timeDif > DAY * 2) { //If the ticket hasn't been modified within 2 days - Warning
			row.classList.add("SCAssistant_Warning");
		}
	}
}

function runServiceDesk(table) {
	for (let i = 0; i < table.children.length; i++) {
		let row = table.children[i];
		let status = row.children[3].innerText;
		
		if (status !== "On Hold") {
			row.classList.add("SCAssistant_Danger");
		}
	}
}

function disableAssistant() {
	let SCAssistant = [".SCAssistant_Danger", ".SCAssistant_Warning", ".SCAssistant_Safe", ".SCAssistant_OnHold", ".SCAssistant_New"];
	
	for (let i = 0; i < SCAssistant.length; i++) {
		let list = document.querySelectorAll(SCAssistant[i]);
		
		for (let j = 0; j < list.length; j++) {
			list[j].classList.remove(SCAssistant[i].substring(1));
		}
	}
}

let SCAssistantNotifications = true;

chrome.storage.sync.get("notifications", function (data) {
	SCAssistantNotifications = data.notifications
});

function showNewTicketNotification() {
	if ((new Date() - lastNotificationSent) < (10 * MIN) && SCAssistantNotifications) return;
	lastNotificationSent = new Date();
	
	chrome.runtime.sendMessage({greeting: "newTicketNotification"}, function(response) {});
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}