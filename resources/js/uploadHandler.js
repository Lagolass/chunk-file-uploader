import uploadService from "./uploadService";
import axios from 'axios';

const handler = {
    form: null,
    file: null,
    btn: null,
    alertSuccess: null,
    alertError: null,
    chunkSize: 1024 * 1024,
    fileChunkSize: 1024 * 1024,
    durationReq : 0,

    async init(form) {
        this.form = form;
        this.btn = form.querySelector('button[type=submit]');
        this.alertSuccess = form.querySelector('.alert-success');
        this.alertError = form.querySelector('.alert-danger');

        await this.checkRequest()

        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.upload()
        });

        this.form.querySelector('input[type=file]').addEventListener('change', (e) => this.changeFile(e));
    },
    upload() {
        this.progress = 0;
        this.result = null;

        if (!this.file) {
            alert('Please select a file');
            return;
        }

        this.btn.setAttribute('disabled', true);

        uploadService.upload(
            this.form.action,
            this.file,
            // onProgress
            percent => {
                this.showProgress(percent)

                if(!this.alertError.classList.contains('visually-hidden'))
                    this.alertError.classList.toggle('visually-hidden');
            },
            // onError
            (err, tries, isTryUpload) => {
                console.log('tries', tries, ' isTryUpload', isTryUpload)
                if(isTryUpload) {
                    this.showError(`Connection error! Trying to upload is ${tries}`);
                } else {
                    this.defaultErrorResponseAjax(err)
                }
            },
            // onSuccess
            res => {
                this.btn.toggleAttribute('disabled');
                this.form.reset();
                this.file = null;

            },
            this.chunkSize
        );
    },
    changeFile(e) {
        this.file = e.target.files[0];
        if(this.file.size > this.chunkSize) {
            if ((this.durationReq * 300) > this.chunkSize) {
                this.fileChunkSize = this.chunkSize - (this.chunkSize % (this.durationReq * 300))
            } else {
                this.fileChunkSize = this.chunkSize;
            }
        } else {
            this.fileChunkSize = this.file.size;
        }
    },
    defaultErrorResponseAjax(error) {
        if (error.response !== undefined) {
            if (error.response.data.errors) {
                let errors = error.response.data.errors;
                console.log(errors);

                let msg = '';
                for (let field in errors) {
                    msg+= errors[field].join(', ')
                }
                this.showError(msg);
            } else if (error.response.data.message) {
                this.showError(error.response.data.message);
            }

            if (error.response.status === 419) {// if CSRF token mismatch.
                location.reload();
            }
            if (error.response.status === 302) {
                if (error.response.data.url !== undefined) {
                    location.replace(error.response.data.url);
                } else {
                    location.reload();
                }
            }
        } else if (error.request) {
            console.log(error.request);
        } else {
            console.log('Error', error.message);
        }

        this.btn.toggleAttribute('disabled');
    },
    showError(msg) {
        this.alertError.innerHTML = msg;

        if(this.alertError.classList.contains('visually-hidden'))
            this.alertError.classList.toggle('visually-hidden');
    },
    showProgress(percentUpload) {
        if(document.querySelector('.progress').classList.contains('visually-hidden'))
            document.querySelector('.progress').classList.toggle('visually-hidden');

        document.querySelector('.progress-bar').style.setProperty('width', percentUpload + '%');
        document.querySelector('.progress-bar').innerHTML = percentUpload + '%';
    },
    checkRequest() {
        let _this = this;
        _this.btn.setAttribute('disabled', true);
        _this.form.querySelector('input[type=file]').setAttribute('disabled', true);
        const instanceAxios = axios.create()
        instanceAxios.interceptors.request.use((config) => {
            config.headers['request-startTime'] = new Date().getTime();
            return config
        })

        instanceAxios.interceptors.response.use((response) => {
            const currentTime = new Date().getTime()
            const startTime = response.config.headers['request-startTime']
            response.headers['request-duration'] = currentTime - startTime
            return response
        })

        instanceAxios.get('/check-request')
            .then((response) => {
                // console.log('response.headers[request-duration]', response.headers['request-duration'])

                _this.durationReq = response.headers['request-duration'];
                _this.btn.toggleAttribute('disabled');
                _this.form.querySelector('input[type=file]').toggleAttribute('disabled');
            }).catch((error) => {
            console.error(`Error`)
        })
    }
}

export default {
    init : (form) => handler.init(form)
}
