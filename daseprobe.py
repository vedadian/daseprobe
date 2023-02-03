import os
import sys
import glob
import flask

def get_dataset_item_key(file_path):
    key, _ = os.path.splitext(os.path.basename(file_path))
    return key

def populate_dataset_images(dataset_root_path):
    return list(glob.glob(f'{dataset_root_path}/**/*.jpg', recursive=True))

def populate_dataset_annotations(dataset_root_path, *additional_annotations_paths):
    result = {}
    for f in glob.glob(f'{dataset_root_path}/**/*.txt', recursive=True):
        key = get_dataset_item_key(f)
        if not key in result:
            result[key] = [f]
    for p in additional_annotations_paths:
        for f in glob.glob(f'{p}/**/*.txt', recursive=True):
            key = get_dataset_item_key(f)
            if key in result:
                result[key].append(f)
    return result

def create_application(dataset_root_path, *additional_annotations_paths):
    app = flask.Flask(
        __name__,
        static_url_path="/",
        static_folder=os.path.join(os.path.dirname(__file__), "static")
    )

    @app.route("/")
    def root():
        return flask.redirect("/index.html")

    def api_route(*args, **kwargs):
        def decorator(f):
            def wrapper():
                if flask.request.is_json:
                    params = flask.request.get_json()
                else:
                    params = {}
                    if flask.request.args:
                        params.update(flask.request.args.to_dict())
                    if flask.request.form:
                        params.update(flask.request.form.to_dict())
                result = f(**params)
                if isinstance(result, flask.Response):
                    return result
                return flask.jsonify(result)
            wrapper.__name__ = f.__name__
            return app.route(*args, **kwargs)(wrapper)
        return decorator

    images = populate_dataset_images(dataset_root_path)
    annotations = populate_dataset_annotations(dataset_root_path, *additional_annotations_paths)

    @api_route("/api/image_count")
    def image_count():
        return len(images)
    
    @api_route("/api/image")
    def get_image(index):
        return flask.send_file(images[int(index)])

    @api_route("/api/annotations")
    def get_annotations(index):
        key = get_dataset_item_key(images[int(index)])
        result = {
            'k': key,
            'a': [
                [[float(e) for e in l.strip().split()] for l in open(f)]
                for f in annotations[key]
            ]
        }
        return result

    app.run(
        host="127.0.0.1",
        port=1361,
        load_dotenv=False,
        debug=True
    )

if __name__ == "__main__":
    create_application(*sys.argv[1:])