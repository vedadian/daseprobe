document.addEventListener("DOMContentLoaded", () => {

    const debounce = f => {
        let debounceTimeout = null;
        return function() {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => f.apply(this, arguments), 300);
        };
    };

    class clsDatasetViewer {
        constructor(parent) {
            this.parent = parent;
            this.moveLeftButton = document.createElement("div");
            this.moveLeftButton.innerHTML = "&laquo;";
            this.moveLeftButton.classList.add("sampleNavControl");
            parent.appendChild(this.moveLeftButton);
            this.sampleContainer = document.createElement("div");
            this.sampleContainer.classList.add("sampleContainer");
            parent.appendChild(this.sampleContainer);
            this.moveRightButton = document.createElement("div");
            this.moveRightButton.innerHTML = "&raquo;";
            this.moveRightButton.classList.add("sampleNavControl");
            parent.appendChild(this.moveRightButton);
            this.waiting = document.createElement("div");
            this.waiting.classList.add("waiting");
            this.waiting.innerHTML = "<div class=\"lds-facebook\"><div></div><div></div><div></div></div>";
            parent.appendChild(this.waiting);
            fetch("/api/image_count").then(r => r.json()).then(c => {
                this.sampleCount = c;
                if(c > 0) {
                    this.loadImagesAndAnnotations();
                    return;
                }
                this.sampleContainer.textContent = "NO IMAGES IN THIS DATASET :(";
                this.waiting.style.display = "none";
            });
            this.moveLeftButton.addEventListener('click', () => this.updateSampleIndexBy(1));
            this.moveRightButton.addEventListener('click', () => this.updateSampleIndexBy(-1));
        }

        updateSampleIndexBy(di) {
            let newIndex = this.sampleIndex + di;
            while(newIndex < 0)
                newIndex += this.sampleCount;
            while(newIndex >= this.sampleCount)
                newIndex -= this.sampleCount;
            this.showSample(newIndex);
        }

        loadImagesAndAnnotations() {
            let URL = window.URL || window.webkitURL;
            this.imageBlobs = Array(this.sampleCount).fill(null);
            this.imageBlobUrls = Array(this.sampleCount).fill(null);
            this.annotations = Array(this.sampleCount).fill(null);
            this.sampleKeys = Array(this.sampleCount).fill(null);

            let loadPromises = Array(this.sampleCount).fill(null).map((_, i) => fetch(`/api/image?index=${i}`).then(r => r.blob()).then(r => {
                this.imageBlobs[i] = r;
                this.imageBlobUrls[i] = URL.createObjectURL(r);
            })).concat(Array(this.sampleCount).fill(null).map((_, i) => fetch(`/api/annotations?index=${i}`).then(r => r.json()).then(r => {
                this.sampleKeys[i] = r["k"];
                this.annotations[i] = r["a"];
            })));
            Promise.all(loadPromises).then(() => {
                this.waiting.style.display = "none";
                this.sample = document.createElement('div');
                this.sample.classList.add('sample');
                this.sample.addEventListener('mousemove', debounce(e => this.handleSampleMouseMove(e)));
                this.sampleImage = document.createElement('img');
                this.sample.appendChild(this.sampleImage);
                this.sampleContainer.appendChild(this.sample);
                this.showSample(0);
            }).catch(e => {
                this.waiting.style.display = "none";
                this.sampleContainer.textContent = 'ERROR LOADING THE DATASET:';
                let errorMessage = document.createElement("p");
                errorMessage.style.color = 'red';
                errorMessage.textContent = JSON.stringify(e);
                this.sampleContainer.appendChild(errorMessage);
            });
        }

        showSample(index) {
            this.sampleIndex = index;
            document.querySelector('#sampleKey').textContent = this.sampleKeys[index];
            this.sampleImage.src = this.imageBlobUrls[index];
            let showAnnotationsInterval = setInterval(() => {
                if(!this.sampleImage.complete)
                    return;
                clearInterval(showAnnotationsInterval);
                this.showAnnotations(index);
            });
        }

        showAnnotations(index) {
            const COLORS = ['green', 'yellow', 'blue', 'red'];
            for(let oldAnnotationDiv of this.sample.querySelectorAll("div.annotation"))
                oldAnnotationDiv.parentElement.removeChild(oldAnnotationDiv);
            for(let annotationSetIndex in this.annotations[index]) {
                let annotationSet = this.annotations[index][annotationSetIndex];
                for(let item of annotationSet) {
                    let [l, cx, cy, w, h] = item;
                    let annotationDiv = document.createElement("div");
                    annotationDiv.specs = item;
                    annotationDiv.classList.add("annotation");
                    annotationDiv.style.left = `${(cx - w / 2) * this.sampleImage.width}px`;
                    annotationDiv.style.top = `${(cy - h / 2) * this.sampleImage.height}px`;
                    annotationDiv.style.width = `${w * this.sampleImage.width}px`;
                    annotationDiv.style.height = `${h * this.sampleImage.height}px`;
                    annotationDiv.style.backgroundColor = COLORS[annotationSetIndex % COLORS.length];
                    this.sample.appendChild(annotationDiv);
                }
            }
        }

        handleSampleMouseMove(e) {
            let [x, y] = [e.offsetX / this.sample.offsetWidth, e.offsetY / this.sample.offsetHeight];
            const containsThisPoint = a => 
                    (x >= a.specs[1] - a.specs[3] / 2) &&
                    (y >= a.specs[2] - a.specs[4] / 2) &&
                    (x <= a.specs[1] + a.specs[3] / 2) &&
                    (y <= a.specs[2] + a.specs[4] / 2);
            Array.from(this.sample.querySelectorAll("div.annotation")).forEach(a => {
                if(containsThisPoint(a)) {
                    if(a.style.display != 'none')
                        a.style.display = 'none';
                } else {
                    if(a.style.display == 'none')
                        a.style.display = '';
                }
            });
        }
    };

    let viewer = new clsDatasetViewer(document.querySelector('#main'));

    // let sampleCount = 0;
    // fetch("/api/image_count").then(r => r.json()).then(c => sampleCount = c);

    // let showSample = index => {
    //     fetch(`/api/image?index=${index}`).then(r => r.blob()).then(r => {
    //         let urlCreator = window.URL || window.webkitURL;
    //         let imageUrl = urlCreator.createObjectURL(r);
    //         document.querySelector('img').src = imageUrl;
    //     });
    //     fetch(`/api/annotations?index=${index}`).then(r => r.json()).then(r => {
    //         for(let oldAnnotationDiv of document.querySelectorAll('div.annotation'))
    //             oldAnnotationDiv.parentElement.removeChild(oldAnnotationDiv);
    //         let image = document.querySelector('img');
    //         const colors = ['yellow', 'green', 'red', 'blue'];
    //         for(let ri = 0; ri < r.length; ++ri) {
    //             let annotations = r[ri];
    //             let updateAnnotationsInterval = setInterval(() => {
    //                 if(!image.complete)
    //                     return;
    //                 clearInterval(updateAnnotationsInterval);
    //                 for(let item of annotations) {
    //                     let [l, cx, cy, w, h] = item;
    //                     let annotationDiv = document.createElement('div');
    //                     annotationDiv.classList.add('annotation');
    //                     annotationDiv.style.left = `${(cx - w/2) * image.width}px`;
    //                     annotationDiv.style.top = `${(cy - h/2) * image.height}px`;
    //                     annotationDiv.style.width = `${w * image.width}px`;
    //                     annotationDiv.style.height = `${h * image.height}px`;
    //                     annotationDiv.style.backgroundColor = colors[ri % colors.length];
    //                     annotationDiv.addEventListener('click', e => {
    //                         if(e.target.style.opacity < 0.01)
    //                             e.target.style.opacity = e.target.oldOpacity;
    //                         else {
    //                             e.target.oldOpacity = annotationDiv.style.opacity;
    //                             annotationDiv.style.opacity = 0;
    //                         }
    //                     });
    //                     image.parentElement.appendChild(annotationDiv);
    //                 }
    //             }, 500);
    //         }
    //     });
    // };

    // let currentIndex = 0;
    // showSample(currentIndex);
    // document.querySelector('#header').addEventListener('dblclick', () => {
    //     currentIndex = (currentIndex + 1) % sampleCount;
    //     showSample(currentIndex);
    // });
});