<template>
    <div class="root">

        <div v-if="error">
            Error loading .msg file:
            {{ error }}
        </div>

        <div v-if="src" class="msg">
            <div class="msg-header">
                <div class="msg-date">
                    {{ email.date }}
                </div>

                <!-- Subject -->
                <div class="msg-subject">
                    Betreff: {{ email.subject }}
                </div>

                <!-- From -->
                <div>
                    <strong>Von:</strong> {{ email.from.name }} &lt;{{ email.from.address }}&gt;
                </div>

                <!-- To -->
                <div v-if="email.to.length > 0" class="msg-recip">
                    <strong>An:</strong>
                    <span v-for="to in email.to" :key="to.address">
                        {{ to.name }} &lt;{{ to.address }}&gt;
                    </span>
                </div>

                <!-- CC -->
                <div v-if="email.cc.length > 0" class="msg-recip">
                    <strong>CC:</strong>
                    <span v-for="cc in email.cc" :key="cc.address">
                        {{ cc.name }} &lt;{{ cc.address }}&gt;
                    </span>
                </div>

                <!-- BCC -->
                <div v-if="email.bcc.length > 0" class="msg-recip">
                    <strong>BCC:</strong>
                    <span v-for="bcc in email.bcc" :key="bcc.address">
                        {{ bcc.name }} &lt;{{ bcc.address }}&gt;
                    </span>
                </div>
            </div>

            <div v-if="email.attachments.length > 0" class="msg-attachs">
                <strong>Anhänge:</strong>
                <ul>
                    <li v-for="attachment in email.attachments" :key="attachment.name" class="msg-attach-btn">
                        {{ attachment.name }} ({{ attachment.size }} bytes)
                    </li>
                </ul>
            </div>

            <div class="msg-content">
                <div v-html="email.body" /> <!-- eslint-disable-line vue/no-v-html -->
            </div>
        </div>
    </div>
</template>

<script>
import MsgReader from '@kenjiuno/msgreader';
import DOMPurify from 'dompurify';

export default {
    name: "EmailView",

    props: {
        src: { type: String },
        mime: { type: String },
    },

    data() {
        return {
            email: {
                date: '',
                from: { name: '', address: '' },
                to: [],
                cc: [],
                bcc: [],
                subject: '',
                body: '',
                attachments: [],
            },
            error: null,
        };
    },

    async mounted() {
        await this.loadAndShow();
        this.doneLoading();
    },

    methods: {

        /**
         * Check if the mime type is appropriate (should be application/vnd.ms-outlook)
         */
        canShowFile() {
            return (
                (this.mime === "application/vnd.ms-outlook") &&
                OCA.Viewer.mimetypes.includes(this.mime)
            );
        },

        /**
         * Fetch the file contents and return it as a MsgReader object.
         */
        async fetchMsgFile() {
            try {
                const response = await fetch(this.src); // eslint-disable-line n/no-unsupported-features/node-builtins

                if (!response.ok) {
                    this.error = response.statusText;
                    console.error(this.error);
                    return null;
                }

                const arrayBuffer = await response.arrayBuffer();
                return new MsgReader(arrayBuffer);

            } catch (error) {
                this.error = error;
                console.error(error);
                return null;
            }
        },

        /**
         * Takes a MsgReader object and preprocesses data into the email object.
         */
        parseMsg(msgReaderObj) {
            const msg = msgReaderObj.getFileData();

            // Date
            if (msg.messageDeliveryTime) {
                const dateObj = new Date(msg.messageDeliveryTime);
                // Convert underscore to hyphen to make it compatible with Intl API
                const locale = OC.getLocale().replace('_', '-')

                this.email.date = new Intl.DateTimeFormat(locale, {
                    dateStyle: 'full',
                    timeStyle: 'short',
                }).format(dateObj);
            }

            this.email.from.name = msg.senderName || '';
            this.email.from.address = msg.senderEmail || '';

            // Extracting 'To' recipients
            this.email.to = this.extractRecipients(msg.recipients, 'to');
            this.email.cc = this.extractRecipients(msg.recipients, 'cc');
            this.email.bcc = this.extractRecipients(msg.recipients, 'bcc');

            // Email subject and body
            this.email.subject = msg.subject || '';
            this.email.body = DOMPurify.sanitize(msg.bodyHtml || msg.body || '', {
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'img', 'style'],
                ALLOWED_ATTR: ['href', 'type', 'class'],
            });

            // Handling attachments
            this.email.attachments = msg.attachments.map(attachment => ({
                fileName: attachment.fileName,
                size: attachment.size || 0, // assuming size is a property of the attachment
            }));
        },

        /**
         * Filter recipients to extract only those of a certain type (e.g. "to" or "cc")
         */
        extractRecipients(recipients, recipType) {
            return recipients
                .filter(recipient => recipient.recipType === recipType)
                .map(recipient => ({
                    name: recipient.name || '',
                    address: this.cleanEmail(recipient.email) || '',
                }));
        },

        /**
         * Uses a regular expression to filter out unnecessary exchange info such as o, ou, cn.
         */
        cleanEmail(rawEmail) {
            const emailRegex = /([^<>,;()[\s]+@[^<>,;()[\s]+\.[^<>,;()[\s]+)/;
            const match = rawEmail.match(emailRegex);
            return match ? match[0] : '';
        },

        /**
         * Triggers the fetching and parsing of the mail, if the given file is valid.
         */
        async loadAndShow() {
            if (!this.canShowFile()) {
                return;
            }
            const msgReader = await this.fetchMsgFile();
            if (!msgReader) return;
            this.parseMsg(msgReader);
        },
    },
};
</script>

<style scoped>
.root {
    background: #fff;
    width: 70vw;
    height: 80vh;
    max-width: 700px;
    margin-top: 10vh;
    overflow: auto;
}

.msg {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    height: 100%;
    overflow: auto;
}

@media (max-width: 700px) {
    .msg {
        min-height: 100%;
        height: fit-content;
    }
}

.msg-header {
    --h-padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: var(--h-padding) var(--h-padding) 0;
}

.msg-subject {
    font-weight: bold;
    font-size: 1.2rem;
}

.msg-date {
    font-size: 0.9em;
    color: #686868;
    text-align: right;
}

.msg-recip span {
    background: #E9E9E9;
    padding: 2px;
    margin: 0 4px;
}

.msg-attachs {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    border-top: 1px solid #7d7d7d;
    padding: 16px;
}

.msg-content {
    padding: 16px;
    flex: 1;
    white-space: pre-wrap;
    color: #000;
    border-top: 1px solid #7d7d7d;
}

.msg-attach-btn {
    display: flex;
    gap: 10px;
    padding: 10px 12px;
    width: fit-content;
    align-items: center;
    color: #fff;
    text-decoration: none;
}
</style>
