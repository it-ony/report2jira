(function(window, chrome) {

    var btn = document.createElement("a");
    btn.className = "jira-btn";
    btn.innerText= 'Create Jira Issue';

    var gotoJira = document.createElement("a");
    gotoJira.className = "jira-btn";

    document.body.prepend(btn);

    btn.onclick = function() {

        var componentElement = document.querySelector("meta[name='component']");
        var component = componentElement  ? componentElement.getAttribute("content") : null;

        if (!component) {
            component = prompt("Which component", "");
        }

        var summary = "[QA] - "
            + document.querySelector("h1 .test-class").innerText.split(".").pop()
            + "."
            + document.querySelector("h1 .test-method").innerText;

        var link = document.querySelector("#ul .url a"),
            startParameter = document.querySelector(".start-parameter pre"),
            productModel = document.querySelector(".product-model pre");

        var parts = [
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

        var description = parts.map(function(s) {
            return s || "";
        }).join("\n\n");

        var screenshot = null;

        var screenshotElement = document.querySelector(".screenshot img");
        if (screenshotElement) {
            screenshot = screenshotElement.getAttribute("src");
        }

        chrome.runtime.sendMessage({
                component: component,
                summary: summary,
                description: description,
                screenshot: screenshot,
                har: location.href.replace("_report.html", "_proxy.har")
            },
            function(response) {

                debugger;

                if (response) {
                    try {
                        response = JSON.parse(response);
                    } catch (e) {
                    }
                }

                if (response && !response.error) {
                    btn.parentNode.removeChild(btn);
                    document.body.prepend(gotoJira);
                    gotoJira.href = response.meta.server +  "/browse/" + response.key;
                    gotoJira.textContent = response.key;
                } else if (!response.showSettings) {
                    alert(response ? response.error : "unknown error");
                }
            });

    };


})(window, chrome);