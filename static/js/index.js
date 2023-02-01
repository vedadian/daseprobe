document.addEventListener('DOMContentLoaded', () => {
    let imageCount = 0;
    fetch("/api/image_count").then(r => r.json()).then(c => imageCount = c);

    let showSample = index => {
        fetch(`/api/image?index=${index}`).then(r => r.blob()).then(r => {
            let urlCreator = window.URL || window.webkitURL;
            let imageUrl = urlCreator.createObjectURL(r);
            document.querySelector('img').src = imageUrl;
        });
        fetch(`/api/annotations?index=${index}`).then(r => r.json()).then(r => {
            for(let oldAnnotationDiv of document.querySelectorAll('div.annotation'))
                oldAnnotationDiv.parentElement.removeChild(oldAnnotationDiv);
            let image = document.querySelector('img');
            let annotations = r[0];
            let updateAnnotationsInterval = setInterval(() => {
                if(!image.complete)
                    return;
                clearInterval(updateAnnotationsInterval);
                for(let item of annotations) {
                    let [l, cx, cy, w, h] = item;
                    let annotationDiv = document.createElement('div');
                    annotationDiv.classList.add('annotation');
                    annotationDiv.style.left = `${cx * image.width}px`;
                    annotationDiv.style.top = `${cy * image.height}px`;
                    annotationDiv.style.width = `${w * image.width}px`;
                    annotationDiv.style.height = `${h * image.height}px`;
                    image.parentElement.appendChild(annotationDiv);
                }
            }, 500);
        });
    };

    let currentIndex = 0;
    showSample(currentIndex);
    document.querySelector('#header').addEventListener('dblclick', () => {
        currentIndex = (currentIndex + 1) % imageCount;
        showSample(currentIndex);
    });
});