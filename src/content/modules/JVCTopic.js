import { formatISO9075, isBefore } from 'date-fns';

import { Hidden } from '../constants';
import { getState } from '../../helpers/storage';
import jvcTopic from '../helpers/JVCTopic.js';
import { getRequest, postRequest } from '../helpers/network.js';
import postTemplate from '../views/topic/post.handlebars';

class HiddenList {
    constructor() {
        this.topic = null;
    }

    async init() {
        this.setupForm();

        const query = {
            startDate: formatISO9075(jvcTopic.posts[0].creationDate)
        };

        if (
            jvcTopic.page !== jvcTopic.lastPage &&
            jvcTopic.posts.length > 1
        ) {
            const endDate = await jvcTopic.getNextPageFirstPostDate();
            query.endDate = formatISO9075(endDate);
        }

        const { topic } = await getRequest(`${Hidden.API_JVC_TOPICS}/${jvcTopic.id}`, query);

        if (topic !== null) {
            this.insertJVCTopic(topic);
            this.highlightPagination(topic);
        }
    }

    highlightPagination(topic) {
        const paginationItems = document.querySelectorAll('.bloc-pagi-default .bloc-liste-num-page span');
        for (const item of paginationItems) {
            const paginationPage = parseInt(item.textContent.trim());
            for (const page of topic.Pages) {
                if (paginationPage === page) {
                    const span = document.createElement('span');
                    span.style.borderTop = '3px solid #083193';
                    span.style.display = 'block';
                    item.insertAdjacentElement('afterbegin', span);
                }
            }
        }

    }

    setupForm() {
        const form = document.querySelector('#bloc-formulaire-forum');
        const jvcPostButton = form.querySelector('.btn.btn-poster-msg.js-post-message');
        jvcPostButton.insertAdjacentElement('afterend', this.createPostButton());
    }

    createPostButton() {
        const button = document.createElement('button');
        button.textContent = 'Poster';
        button.type = 'button';
        button.classList.add('btn', 'btn-poster-msg');
        button.style.backgroundColor = '#083193';
        button.addEventListener('click', async () => {
            try {
                const content = document.querySelector('textarea#message_topic').value;

                const body = {
                    forum: {
                        id: jvcTopic.forumId,
                        name: jvcTopic.forumName
                    },
                    topic: {
                        title: jvcTopic.title,
                        viewId: jvcTopic.viewId,
                        firstPostDate: '2020-05-09 08:05:43.117493+00',
                        firstPostContent: 'Bonjour à tous',
                        firstPostUsername: 'BaptisteGonella'
                    },
                    post: {
                        content,
                        page: jvcTopic.lastPage
                    }
                };

                const state = await getState();
                if (!state.user.jwt) {
                    body.post.username = state.user.name || 'Anonymous';
                }

                const result = await postRequest(`${Hidden.API_JVC_TOPICS}/${jvcTopic.id}`, body, state.user.jwt);
                console.log(result);

                const reloadUrl = `http://www.jeuxvideo.com/forums/${jvcTopic.viewId}-${jvcTopic.forumId}-${jvcTopic.id}-${jvcTopic.lastPage}-0-1-0-0.htm`;
                location.replace(reloadUrl);
            } catch (err) {
                console.error(err);
            }
        });
        return button;
    }

    insertJVCTopic(topic) {
        const jvcPosts = jvcTopic.posts;
        topic.Posts = topic.Posts.reverse();

        for (const hiddenPost of topic.Posts) {
            const hiddenDate = new Date(hiddenPost.Post.CreationDate);
            let previousPost = null;

            for (let i = 0; i < jvcPosts.length; i++) {
                let jvcDate = jvcPosts[i].creationDate;
                if (isBefore(hiddenDate, jvcDate)) {
                    previousPost = jvcPosts[i];
                    break;
                }
            }

            if (previousPost !== null) {
                previousPost.element.insertAdjacentHTML('beforebegin', postTemplate(hiddenPost));
            } else {
                jvcPosts[jvcPosts.length - 1].element.insertAdjacentHTML('afterend', postTemplate(hiddenPost));
            }
        }
    }
}

export default new HiddenList();
