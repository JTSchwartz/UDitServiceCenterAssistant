let iframeDoc = null;

try {
	iframe = document.getElementById("appDesktop");
	iframeWin = iframe.contentWindow || iframe;
	iframeDoc = iframe.contentDocument || iframeWin.document;
} catch {
	iframeDoc = document;
}

// ASSISTANT
sleep(5000).then(() => {
	iframeDoc.getElementById("btnRefresh").href = "javascript: window.location.reload()";
	let queueRefreshBtn = iframeDoc.getElementsByClassName("refreshAnchor");
	
	for (let i = 0; i < queueRefreshBtn.length; i++) {
		queueRefreshBtn[i].onclick = function () {
			refresher(3000);
		};
	}
	
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

sleep(600000).then(() => {
	setInterval(refresh, 600000);
	
	function refresh() {
		if (SCAssistantAutoRefresh) {
			window.location.reload();
		}
	}
});

// FUNCTIONS
function refresher(time) {
	chrome.storage.sync.get("enabled", async function (data) {
		await sleep(time);
		
		if (data.enabled) {
			disableAssistant();
			runAssistant();
		}
	});
}

function runAssistant() {
	runRental();
	runOpenServiceDesk();
	runServiceDesk();
}

function runRental() {
	let div = iframeDoc.getElementById("Column1");
	let childDiv = div.getElementsByClassName("ModuleContent")[0];
	let table = childDiv.children[0].children[1];
	
	for (let i = 0; i < table.children.length; i++) {
		let row = table.children[i];
		let timestampString = row.children[3].innerText;
		let timeArray = timestampString.substring(4,);
		let date = timeArray.split("/");
		
		let ticketTime = new Date(parseInt(date[2]) + 2000, parseInt(date[0]) - 1, parseInt(date[1]));
		let timeNow = new Date(Date.now());
		let timeDif = ticketTime - timeNow;
		
		if (timeDif < 0) {
			row.classList.add("SCAssistant_Danger");
		} else if (timeDif < 86400000) {
			row.classList.add("SCAssistant_Warning");
		}
	}
}

function runOpenServiceDesk() {
	let div = iframeDoc.getElementById("Column2");
	let childDiv = div.getElementsByClassName("ModuleContent")[1];
	let table = childDiv.children[0].children[1];
	
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
		} else if (timeDif > 345600000) {
			row.classList.add("SCAssistant_Danger");
		} else if (timeDif > 172800000) {
			row.classList.add("SCAssistant_Warning");
		}
	}
}

function runServiceDesk() {
	let div = iframeDoc.getElementById("Column3");
	let childDiv = div.getElementsByClassName("ModuleContent")[2];
	let table = childDiv.children[0].children[1];
	
	for (let i = 0; i < table.children.length; i++) {
		table.children[i].classList.add("SCAssistant_Danger");
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

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}