import * as chalk from 'chalk'
import longest from 'longest'
import map from 'lodash.map'
import wrap from 'word-wrap'

function filter(array) {
    return array.filter(function(x) {
        return x
    })
}

function headerLength(answers) {
    return (
        answers.type.length + 2 + (answers.scope ? answers.scope.length + 2 : 0)
    )
}

function maxSummaryLength(answers) {
    return 72 - headerLength(answers)
}

function filterSubject(subject) {
    subject = subject.trim()
    if (subject.charAt(0).toLowerCase() !== subject.charAt(0)) {
        subject =
            subject.charAt(0).toLowerCase() + subject.slice(1, subject.length)
    }
    while (subject.endsWith('.')) {
        subject = subject.slice(0, subject.length - 1)
    }
    return subject
}

export default function(options) {
    var types = options.types

    var length = longest(Object.keys(types)).length + 1
    var choices = map(types, function(type, key) {
        return {
            name: (key + ':').padEnd(length) + ' ' + type.description,
            value: key,
        }
    })

    return {
        // When a user runs `git cz`, prompter will
        // be executed. We pass you cz, which currently
        // is just an instance of inquirer.js. Using
        // this you can ask questions and get answers.
        //
        // The commit callback should be executed when
        // you're ready to send back a commit template
        // to git.
        //
        // By default, we'll de-indent your commit
        // template and will keep empty lines.
        prompter: function(cz, commit) {
            console.log(
                '\nLine 1 will be cropped at 100 characters. All other lines will be wrapped after 100 characters.\n',
            )

            // Let's ask some questions of the user
            // so that we can populate our commit
            // template.
            //
            // See inquirer.js docs for specifics.
            // You can also opt to use another input
            // collection library if you prefer.
            cz.prompt([
                {
                    type: 'list',
                    name: 'type',
                    message:
                        "Select the type of change that you're committing:",
                    choices: choices,
                    default: options.defaultType,
                },
                {
                    type: 'input',
                    name: 'subject',
                    message: function(answers) {
                        return (
                            'Write a short, imperative tense description of the change, (max ' +
                            maxSummaryLength(answers) +
                            ' chars):\n'
                        )
                    },
                    default: options.defaultSubject,
                    validate: function(subject, answers) {
                        var filteredSubject = filterSubject(subject)
                        return filteredSubject.length == 0
                            ? 'subject is required'
                            : filteredSubject.length <=
                              maxSummaryLength(answers)
                            ? true
                            : 'Subject length must be less than or equal to ' +
                              maxSummaryLength(answers) +
                              ' characters. Current length is ' +
                              filteredSubject.length +
                              ' characters.'
                    },
                    transformer: function(subject, answers) {
                        var filteredSubject = filterSubject(subject)
                        var color =
                            filteredSubject.length <= maxSummaryLength(answers)
                                ? chalk.green
                                : chalk.red
                        return color(
                            '(' + filteredSubject.length + ') ' + subject,
                        )
                    },
                    filter: function(subject) {
                        return filterSubject(subject)
                    },
                },
                {
                    type: 'input',
                    name: 'body',
                    message:
                        'Provide a longer description of the change: (press enter to skip)\n',
                    default: options.defaultBody,
                },
                {
                    type: 'confirm',
                    name: 'isBreaking',
                    message: 'Are there any breaking changes?',
                    default: false,
                },
                {
                    type: 'input',
                    name: 'breaking',
                    message: 'Describe the breaking changes:\n',
                    when: function(answers) {
                        return answers.isBreaking
                    },
                },
                {
                    type: 'confirm',
                    name: 'isIssueAffected',
                    message: 'Does this change affect any open issues?',
                    default: options.defaultIssues,
                },
                {
                    type: 'input',
                    name: 'issues',
                    message:
                        'Add issue references (e.g. "fix #123", "re #123".):\n',
                    when: function(answers) {
                        return answers.isIssueAffected
                    },
                    default: options.defaultIssues
                        ? options.defaultIssues
                        : undefined,
                },
            ]).then(function(answers) {
                var maxLineWidth = 100

                var wrapOptions = {
                    trim: true,
                    cut: false,
                    newline: '\n',
                    indent: '',
                    width: maxLineWidth,
                }

                // Hard limit this line in the validate
                var head = answers.type + ': ' + answers.subject

                // Wrap these lines at 100 characters
                var body = wrap(answers.body, wrapOptions)

                // Apply breaking change prefix, removing it if already present
                var breaking = answers.breaking ? answers.breaking.trim() : ''
                breaking = breaking
                    ? 'BREAKING CHANGE: ' +
                      breaking.replace(/^BREAKING CHANGE: /, '')
                    : ''
                breaking = breaking ? wrap(breaking, wrapOptions) : false

                var issues = answers.issues
                    ? wrap(answers.issues, wrapOptions)
                    : false

                commit(filter([head, body, breaking, issues]).join('\n\n'))
            })
        },
    }
}
