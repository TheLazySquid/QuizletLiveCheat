export default function addModifiedScript(src: string) {
    // we want to manually fetch the script so we can modify it
    fetch(src)
        .then(response => response.text())
        .then(text => {
            const insertAfterRegex = /j=E\(\)\(\(0,i\.Z\)\(.\)\),/g;
            const insertText = "window.qlc.setIo(j),"

            // find the index of the insert after regex and append "window.qlc.io=j," after it
            const index = text.search(insertAfterRegex) + insertAfterRegex.exec(text)![0].length;
            text = text.slice(0, index) + insertText + text.slice(index);

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