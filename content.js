(function(window, chrome) {

    let summary = "[QA] - "
        + document.querySelector("h1 .test-class").innerText.split(".").pop()
        + "."
        + document.querySelector("h1 .test-method").innerText;


    chrome.runtime.sendMessage({
        method: "getTicket",
        data: {
            summary: summary
        }
    }, function(response) {

        if (response && response.meta && response.meta.issue) {
            showGotoIssueButton(response.meta.issue, response.meta.server);
        } else {
            addCreateIssueButton();
        }

    });

    let btn;

    function addCreateIssueButton() {

        btn = document.createElement("a");
        btn.className = "jira-btn";
        btn.innerText = 'Create Jira Issue';

        document.body.prepend(btn);

        btn.onclick = function() {

            const componentElement = document.querySelector("meta[name='component']");
            let component = componentElement ? componentElement.getAttribute("content") : null;

            if (!component) {
                component = prompt("Which component", "");
            }

            const link           = document.querySelector("#ul .url a"),
                  startParameter = document.querySelector(".start-parameter pre"),
                  productModel   = document.querySelector(".product-model pre");

            const parts = [
                "See " + window.location.href + " for full details",
                document.querySelector(".stacktrace-message").innerText,
                "{code}\n" + document.querySelector(".stacktrace").innerText + "\n{code}"
            ];

            if (link) {
                parts.push(link.getAttribute("href"))
            }

            if (startParameter) {
                parts.push("{code}\n" + startParameter.innerText + "\n{code}");
            }

            if (productModel) {
                parts.push("{code}\n" + productModel.innerText + "\n{code}");
            }

            const description = parts.map(function(s) {
                return s || "";
            }).join("\n\n");

            let screenshot = null;

            const screenshotElement = document.querySelector(".screenshot img");
            if (screenshotElement) {
                screenshot = screenshotElement.getAttribute("src");
            }

            chrome.runtime.sendMessage({
                method: "createIssue",
                    data: {
                        component: component,
                        summary: summary,
                        description: description,
                        screenshot: screenshot,
                        har: location.href.replace("_report.html", "_proxy.har")
                    }
                }, function(response) {

                    debugger;

                    if (response) {
                        try {
                            response = JSON.parse(response);
                        } catch (e) {
                        }
                    }

                    if (response && !response.error) {
                        btn.parentNode && btn.parentNode.removeChild(btn);
                        showGotoIssueButton(response.key, response.meta.server)
                    } else if (!response.showSettings) {
                        alert(response ? response.error : "unknown error");
                    }
                });

        };

    }

    function showGotoIssueButton(ticketKey, server) {

        const gotoJira = document.createElement("a");
        gotoJira.className = "jira-btn";

        document.body.prepend(gotoJira);

        gotoJira.href = server + "/browse/" + ticketKey;
        gotoJira.textContent = ticketKey;

    }

})(window, chrome);