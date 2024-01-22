export default function addModifiedScript(src: string) {
    // we want to manually fetch the script so we can modify it
    fetch(src)
        .then(response => response.text())
        .then(text => {
            const insertBeforeRegex = /.\.on\("reconnect_failed\"/g;
            const insertIndex = text.search(insertBeforeRegex);

            if(insertIndex == -1) return alert("Something went wrong! This likely means Quizlet made an update to their code. Please open an issue on GitHub.");

            const insertText = `window.qlc.setIo(${text[insertIndex]}),`
            text = text.slice(0, insertIndex) + insertText + text.slice(insertIndex);

            // create a new blob with the modified text
            const blob = new Blob([text], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);

            // create a new script element with the modified url
            const script = document.createElement('script');
            script.src = url;
            
            // append the script element to the document
            document.head.appendChild(script);
        });
}