module.exports = {
    hooks: {
        'pre-commit': {
            tasks: [
                'touch common_str_task_fail && exit 1'
            ]
        }
    }
};