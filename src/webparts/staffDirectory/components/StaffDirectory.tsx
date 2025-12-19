import * as React from 'react';
import styles from './StaffDirectory.module.scss';
import { IStaffDirectoryProps } from './IStaffDirectoryProps';

import useSearch from '../hooks/useSearch';
import Search from './Search/Search';
import Results from './Results/Results';
import Paging from './Paging/Paging';
import { IPerson } from '../interfaces/IPerson';
import { Dropdown, IDropdownOption, Text } from 'office-ui-fabric-react';
import PersonPopup from './PersonPopup/PersonPopup'; // ✔ correct import
import './global.css';

interface IStaffDirectoryState {
  search: string;
  page: number;
  items: IPerson[];
  selected: string | number;
  selectedPerson?: IPerson; // ✔ using undefined not null
}

const StaffDirectory: React.FC<IStaffDirectoryProps> = ({
  title,
  showDepartmentFilter,
  departments,
  group,
  pageSize,
  context
}) => {
  const [state, setState] = React.useState<IStaffDirectoryState>({
    search: '',
    page: 1,
    items: [],
    selected: '',
    selectedPerson: undefined // ✔ FIXED
  });

  const { total, searchByText, getNextPage, loading, results } =
    useSearch(context, group, pageSize);

  const handleChange = (
    event?: React.ChangeEvent<HTMLInputElement>,
    newValue?: string
  ): void => {
    setState((s) => ({ ...s, search: newValue || '' }));
  };

  const resetSearch = (): void => {
    setState((s) => ({ ...s, search: '' }));
  };

  const handleSubmit = async (): Promise<void> => {
    const { search, selected } = state;

    setState((s) => ({
      ...s,
      items: [],
      page: 1
    }));

    await searchByText(search, String(selected)).catch(console.error);
  };

  const goToPage = async (pageNum: number): Promise<void> => {
    if (pageNum > state.page) {
      await getNextPage();
    }
    setState((s) => ({ ...s, page: pageNum }));
  };

  const handleDropdown = (
    event: React.FormEvent<HTMLDivElement>,
    option?: IDropdownOption
  ): void => {
    setState((s) => ({ ...s, selected: option?.key ?? '' }));
  };

  const load = async (): Promise<void> => {
    await searchByText('', state.selected as string).catch(console.error);
  };

  React.useEffect(() => {
    setState((s) => ({ ...s, items: [], page: 1 }));
    void load(); // ✔ no-floating-promises fixed
  }, [group, state.selected]);

  React.useEffect(() => {
    setState((s) => ({ ...s, items: [...s.items, ...results] }));
  }, [results]);

  const displayedItems = React.useMemo(() => {
    const { page, items } = state;
    const startIndex = (page - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [state, pageSize]);

  return (
    <section className={styles.staffDirectory}>
      <div>
        <div className={styles.title}>
          <Text as="h1" variant="xLarge">
            {title}
          </Text>
        </div>

        <div className={styles.search}>
          <Search
            placeholder="Search name, department, or job title"
            onChange={handleChange}
            onClear={resetSearch}
            onSearch={handleSubmit}
            value={state.search}
            className={styles.searchBar}
          />

          {showDepartmentFilter && (
            <Dropdown
              options={[
                { key: '', text: 'All departments' },
                ...departments
              ]}
              placeholder="Select department"
              selectedKey={state.selected}
              onChange={handleDropdown}
              className={styles.dropdown}
            />
          )}
        </div>

        <Paging
          count={total}
          page={state.page}
          pageSize={pageSize}
          onPageChange={goToPage}
        />

        <Results
          results={displayedItems}
          loading={loading}
          onSelect={(p: IPerson) =>
            setState((s) => ({ ...s, selectedPerson: p }))
          }
        />

        {state.selectedPerson && (
          <PersonPopup
            person={state.selectedPerson}
            onClose={() =>
              setState((s) => ({ ...s, selectedPerson: undefined }))
            }
          />
        )}
      </div>
    </section>
  );
};

export default StaffDirectory;
