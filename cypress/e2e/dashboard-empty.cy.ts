let authCookie = ''
describe('dashboard-empty flow', () => {
  describe('given the user is logged in', () => {
    before('get auth cookie', () => {
      cy.intercept('/api/sign-in').as('signIn')
      cy.visit('http://localhost:3000/sign-in')
      cy.get('[data-cy="email-address-input"]').type(
        'mihai.maxim+createBoardFE@thinslices.com',
      )
      cy.get('[data-cy="password-input"]').type('password1234')

      cy.get('[data-cy="sign-in-account-button"]').click()

      cy.wait('@signIn')

      console.log(
        cy.getCookie('connect.sid').then((cookie) => {
          authCookie = cookie!.value
        }),
      )
    })

    beforeEach(() => {
      cy.setCookie('connect.sid', authCookie)
    })

    describe('given I am on a small screen', () => {
      it('should display the dashboard with all the required options', () => {
        cy.visit('http://localhost:3000')
        cy.get('[data-cy="sidebar-board-option"]').eq(0).click()

        cy.viewport(375, 667)
        cy.get('[data-cy="platform-logo"]').should('be.visible')
        cy.contains('Boards')
        cy.get('[data-cy="platform-launch-dropdown"]').should('be.visible')
        cy.get('[data-cy="add-new-task-button"]').should('be.disabled')
        cy.get('[data-cy="add-new-column-button"]').should('be.visible')
        cy.contains('This board is empty. Create a new column to get started.')
        cy.get('[data-cy="edit-board-button"]').should('be.visible')
        cy.get('[data-cy="sidebar"]').should('not.exist')
        cy.get('[data-cy="show-sidebar-button"]').should('not.exist')

        cy.contains('+ Add New Column')

        cy.get('[data-cy="platform-launch-dropdown"]').click()

        cy.get('[data-cy="modal-background"]').should('be.visible')

        cy.get('[data-cy="sidebar"]').should('be.visible')

        cy.contains('+ Add New Task')

        cy.get('[data-cy="sidebar-all-boards-counter"]').should('be.visible')
        cy.contains('ALL BOARDS (2)')

        cy.get('[data-cy="sidebar-create-new-board-button"]').should(
          'be.visible',
        )

        cy.contains('+ Create New Board')

        cy.get('[data-cy="sidebar-switch-theme-button"]').should('be.visible')

        cy.get('[data-cy="modal-background"]').click('topRight')

        cy.get('[data-cy="sidebar"]').should('not.exist')
      })
    })

    describe('given I am on a normal screen', () => {
      it('should display the dashboard with all the required options', () => {
        cy.visit('http://localhost:3000')
        cy.get('[data-cy="sidebar-board-option"]').eq(0).click()

        cy.viewport(768, 1024)
        cy.get('[data-cy="platform-logo-full"]').should('be.visible')
        cy.contains('Boards')
        cy.get('[data-cy="add-new-task-button"]').should('be.disabled')
        cy.get('[data-cy="add-new-column-button"]').should('be.visible')
        cy.contains('This board is empty. Create a new column to get started.')

        cy.get('[data-cy="sidebar"]').should('be.visible')
        cy.get('[data-cy="edit-board-button"]').should('be.visible')
        cy.contains('+ Add New Task')

        cy.get('[data-cy="sidebar-all-boards-counter"]').should('be.visible')
        cy.contains('ALL BOARDS (2)')

        cy.get('[data-cy="sidebar-create-new-board-button"]').should(
          'be.visible',
        )

        cy.contains('+ Create New Board')

        cy.get('[data-cy="sidebar-switch-theme-button"]').should('be.visible')

        cy.get('[data-cy="hide-sidebar-button"]').should('be.visible')

        cy.get('[data-cy="hide-sidebar-button"]').click()

        cy.get('[data-cy="sidebar"]').should('not.exist')

        cy.get('[data-cy="show-sidebar-button"]').should('be.visible')

        cy.get('[data-cy="show-sidebar-button"]').click()

        cy.get('[data-cy="sidebar"]').should('be.visible')
      })
    })

    describe('given I click on add new column button', () => {
      it('should let me create a new board', () => {
        cy.visit('http://localhost:3000')
        cy.get('[data-cy="sidebar-board-option"]').eq(0).click()

        cy.get('[data-cy="add-new-column-button"]').click()
        cy.contains('Edit Board')
        cy.contains('Board Name')
        cy.get('[data-cy="board-name-input-label"]')
        cy.get('[data-cy="create-new-column-button"]').click()
        cy.get('[data-cy="create-new-column-button"]').click()

        cy.get('[data-cy="board-columns-input-label"]')
        cy.get('[data-cy="column-name-input"]').should('have.length', 2)
        cy.get('[data-cy="remove-column-button"]').should('have.length', 2)

        cy.get('[data-cy="remove-column-button"]').eq(0).click()

        cy.get('[data-cy="remove-column-button"]').eq(0).click()
        cy.get('[data-cy="board-columns-input-label"]').should('not.exist')
        cy.get('[data-cy="column-name-input"]').should('not.exist')
        cy.get('[data-cy="remove-column-button"]').should('not.exist')

        cy.get('[data-cy="board-name-input"]').clear()

        cy.get('[data-cy="update-board-button"]').click()
        cy.contains('Name should contain at least 1 character')

        cy.get('[data-cy="create-new-column-button"]').click()
        cy.get('[data-cy="column-name-input"]').type('Name')

        cy.get('[data-cy="create-new-column-button"]').click()
        cy.get('[data-cy="column-name-input"]').eq(1).type('Name')

        cy.get('[data-cy="update-board-button"]').click()

        cy.get('span:contains("Column names must be unique")')
          .its('length')
          .should('eq', 2)

        cy.get('[data-cy="board-name-input"]').type('Test Board Name 23')

        cy.get('[data-cy="update-board-button"]').click()

        cy.contains('Name can only contain letters and spaces')

        cy.get('[data-cy="column-name-input"]')
          .clear()
          .eq(1)
          .type('column 12312')
        cy.get('[data-cy="column-name-input"]')
          .clear()
          .eq(0)
          .type(
            'column name with sadasdsadasdasdasdasdasdsajwqeqwejkqweqwejwqkewqjeq',
          )

        cy.get('[data-cy="update-board-button"]').click()

        cy.get(
          'span:contains("Column name can only contain letters and spaces")',
        )
          .its('length')
          .should('eq', 1)

        cy.get(
          'span:contains("Column name should contain at most 25 characters")',
        )
          .its('length')
          .should('eq', 1)

        cy.get('[data-cy="board-name-input"]').clear().type('Test Board')

        cy.get('[data-cy="column-name-input"]').eq(0).clear().type('Todo')

        cy.get('[data-cy="column-name-input"]').eq(1).clear().type('Doing')

        cy.intercept('PUT', '/api/boards/*', {
          statusCode: 409,
        }).as('updateBoard')

        cy.get('[data-cy="update-board-button"]').click()

        cy.contains('Column name should contain at most 25 characters').should(
          'not.exist',
        )
        cy.contains('Column name can only contain letters and spaces').should(
          'not.exist',
        )

        cy.contains('Column names must be unique').should('not.exist')

        cy.wait('@updateBoard')

        cy.contains('You already created a board with this name').should(
          'exist',
        )
      })
    })

    describe('given I click on the board menu and select edit board', () => {
      it('should let me edit the board', () => {
        cy.visit('http://localhost:3000')
        cy.get('[data-cy="sidebar-board-option"]').eq(1).click()

        cy.get('[data-cy="edit-board-button"]').click()

        cy.wait(2000)

        cy.get('[data-cy="board-menu-edit-button"]').click()

        cy.contains('Edit Board')
        cy.contains('Board Name')
        cy.get('[data-cy="board-name-input-label"]')

        cy.get('[data-cy="board-columns-input-label"]')

        cy.get('[data-cy="column-name-input"]').should('have.length', 2)
        cy.get('[data-cy="remove-column-button"]').should('have.length', 0)

        cy.get('[data-cy="board-name-input"]').clear()

        cy.get('[data-cy="update-board-button"]').click()
        cy.contains('Name should contain at least 1 character')

        cy.get('[data-cy="column-name-input"]').eq(0).clear().type('Name')

        cy.get('[data-cy="column-name-input"]').eq(1).clear().type('Name')

        cy.get('[data-cy="update-board-button"]').click()

        cy.get('span:contains("Column names must be unique")')
          .its('length')
          .should('eq', 2)

        cy.get('[data-cy="board-name-input"]').type('Test Board Name 23')

        cy.get('[data-cy="update-board-button"]').click()

        cy.contains('Name can only contain letters and spaces')

        cy.get('[data-cy="column-name-input"]')
          .clear()
          .eq(1)
          .type('column 12312')
        cy.get('[data-cy="column-name-input"]')
          .clear()
          .eq(0)
          .type(
            'column name with sadasdsadasdasdasdasdasdsajwqeqwejkqweqwejwqkewqjeq',
          )

        cy.get('[data-cy="update-board-button"]').click()

        cy.get(
          'span:contains("Column name can only contain letters and spaces")',
        )
          .its('length')
          .should('eq', 1)

        cy.get(
          'span:contains("Column name should contain at most 25 characters")',
        )
          .its('length')
          .should('eq', 1)

        cy.get('[data-cy="board-name-input"]').clear().type('Test Board')

        cy.get('[data-cy="column-name-input"]').eq(0).clear().type('Todo')

        cy.get('[data-cy="column-name-input"]').eq(1).clear().type('Doing')

        cy.intercept('PUT', '/api/boards/*', {
          statusCode: 409,
        }).as('updateBoard')

        cy.get('[data-cy="update-board-button"]').click()

        cy.contains('Column name should contain at most 25 characters').should(
          'not.exist',
        )
        cy.contains('Column name can only contain letters and spaces').should(
          'not.exist',
        )

        cy.contains('Column names must be unique').should('not.exist')

        cy.wait('@updateBoard')

        cy.contains('You already created a board with this name').should(
          'exist',
        )
      })
    })

    describe('given I click on the board menu and select delete board', () => {
      it('should show me the delete board confirmation modal', () => {
        cy.visit('http://localhost:3000')
        cy.get('[data-cy="sidebar-board-option"]').eq(1).click()

        cy.get('[data-cy="edit-board-button"]').click()
        cy.wait(2000)

        cy.get('[data-cy="board-menu-delete-button"]').click()

        cy.contains('Delete this board?')

        cy.contains(
          `Are you sure you want to delete the ‘Non Empty Board’ board? This action will remove all columns and tasks and cannot be reversed.`,
        )
        cy.intercept('DELETE', '/api/boards/*', {
          statusCode: 204,
        }).as('deleteBoard')

        cy.get('[data-cy="delete-board-cancel-button"]')

        cy.get('[data-cy="delete-board-confirmation-button"]').click()

        cy.wait('@deleteBoard')

        cy.get('[data-cy="delete-board-confirmation-button"]').should(
          'not.exist',
        )
      })
    })
  })
})
